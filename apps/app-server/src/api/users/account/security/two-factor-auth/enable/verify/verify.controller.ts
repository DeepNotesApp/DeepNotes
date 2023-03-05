import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { generateRecoveryCodes } from '../../generate-recovery-codes/generate-recovery-codes.controller';
import { VerifyService } from './verify.service';

class BodyDto extends createZodDto(
  z.object({
    authenticatorToken: z.string().regex(/^\d{6}$/),
  }),
) {}

export type EndpointValues = BodyDto & {
  userId: string;

  authenticatorSecret?: string;

  dtrx: DataTransaction;
};

@Controller()
export class VerifyController {
  constructor(readonly endpointService: VerifyService) {}

  @Post()
  async handle(
    @Locals('userId') userId: string,

    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = {
          userId,

          dtrx,

          ...body,
        };

        values.authenticatorSecret =
          (await this.endpointService.getAuthenticatorSecret(values))!;

        checkRedlockSignalAborted(signals);

        if (values.authenticatorSecret == null) {
          throw new HttpException(
            'Two-factor authentication is not enabled.',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (!(await this.endpointService.checkAuthenticatorToken(values))) {
          throw new HttpException(
            'Authenticator token is incorrect.',
            HttpStatus.BAD_REQUEST,
          );
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.finishVerification(values);

        checkRedlockSignalAborted(signals);

        return {
          recoveryCodes: await generateRecoveryCodes(userId, { dtrx }),
        };
      });
    });
  }
}
