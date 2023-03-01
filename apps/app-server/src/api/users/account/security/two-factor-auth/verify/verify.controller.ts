import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { nanoid } from 'nanoid';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { VerifyService } from './verify.service';

export type EndpointValues = {
  userId: string;

  authenticatorToken: string;
  authenticatorSecret?: string;

  recoveryCodes?: string[];

  dtrx: DataTransaction;
};

@Controller()
export class VerifyController {
  constructor(readonly endpointService: VerifyService) {}

  @Post()
  async handle(
    @Locals('userId') userId: string,

    @Body('authenticatorToken') authenticatorToken: string,
  ) {
    return await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = { userId, authenticatorToken, dtrx };

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

        values.recoveryCodes = Array(10)
          .fill(null)
          .map(() => nanoid());

        await this.endpointService.finishVerification(values);

        checkRedlockSignalAborted(signals);

        return {
          recoveryCodes: values.recoveryCodes,
        };
      });
    });
  }
}
