import type { UserModel } from '@deeplib/db';
import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { isBase64 } from '@stdlib/base64';
import { isNanoID, w3cEmailRegex } from '@stdlib/misc';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import type { TransactionOrKnex } from 'objection';
import { dataAbstraction } from 'src/data/data-abstraction';

import { RegisterService } from './register.service';

class BodyDto extends createZodDto(
  z.object({
    userId: z.string().refine(isNanoID),
    groupId: z.string().refine(isNanoID),
    pageId: z.string().refine(isNanoID),

    email: z.string().regex(w3cEmailRegex),
    loginHash: z.string().refine(isBase64),

    userPublicKeyring: z.string().refine(isBase64),
    userEncryptedPrivateKeyring: z.string().refine(isBase64),
    userEncryptedSymmetricKeyring: z.string().refine(isBase64),

    userEncryptedName: z.string().refine(isBase64),
    userEncryptedDefaultNote: z.string().refine(isBase64),
    userEncryptedDefaultArrow: z.string().refine(isBase64),

    groupEncryptedAccessKeyring: z.string().refine(isBase64),
    groupEncryptedInternalKeyring: z.string().refine(isBase64),
    groupEncryptedContentKeyring: z.string().refine(isBase64),

    groupPublicKeyring: z.string().refine(isBase64),
    groupEncryptedPrivateKeyring: z.string().refine(isBase64),

    pageEncryptedSymmetricKeyring: z.string().refine(isBase64),
    pageEncryptedRelativeTitle: z.string().refine(isBase64),
    pageEncryptedAbsoluteTitle: z.string().refine(isBase64),
  }),
) {}

export type EndpointValues = BodyDto & {
  ip: string;
  userAgent: string;

  user?: UserModel;

  trx?: TransactionOrKnex;
};

@Controller()
export class RegisterController {
  constructor(readonly endpointService: RegisterService) {}

  @Post()
  async handle(
    @Body() body: BodyDto,

    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return await dataAbstraction().transaction(async ({ trx }) => {
      let values: EndpointValues = { ...body, ip, userAgent, trx };

      // Check if already registered

      const user = await this.endpointService.getUser(values);

      if (user != null) {
        if (user.email_verified) {
          throw new HttpException(
            'Email already registered.',
            HttpStatus.CONFLICT,
          );
        } else {
          throw new HttpException(
            'Email awaiting verification.',
            HttpStatus.CONFLICT,
          );
        }
      }

      // Create user

      values = {
        ...values,

        user: await this.endpointService.registerUser(values),
      };

      await this.endpointService.sendEmail(values);
    });
  }
}
