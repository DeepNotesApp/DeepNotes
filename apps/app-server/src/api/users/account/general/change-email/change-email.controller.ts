import { UserModel } from '@deeplib/db';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { base64ToBytes, isBase64 } from '@stdlib/base64';
import { getPasswordHashValues } from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { equalUint8Arrays, isNanoID } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { FastifyReply } from 'fastify';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { derivePasswordValues } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { decryptRehashedLoginHash, Locals } from 'src/utils';

import { ChangeEmailService } from './change-email.service';

class BodyDto extends createZodDto(
  z.object({
    newEmail: z.string().email(),

    oldLoginHash: z.string().refine(isBase64),
    newLoginHash: z.string().refine(isBase64).optional(),

    encryptedPrivateKeyring: z.string().refine(isBase64).optional(),
    encryptedSymmetricKeyring: z.string().refine(isBase64).optional(),

    emailVerificationCode: z.string().refine(isNanoID).optional(),
  }),
) {}

interface LocalValues {
  userId: string;
  sessionId: string;
}

export type EndpointValues = BodyDto &
  LocalValues & {
    user?: UserModel;

    dtrx: DataTransaction;

    reply: FastifyReply;
  };

@Controller()
export class ChangeEmailController {
  constructor(private readonly endpointService: ChangeEmailService) {}

  @Post()
  async handle(
    @Locals() locals: LocalValues,
    @Body() body: BodyDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return await usingLocks(
      [[`user-lock:${locals.userId}`]],
      async (signals) => {
        return await dataAbstraction().transaction(async (dtrx) => {
          const values: EndpointValues = { ...locals, ...body, dtrx, reply };

          // Verify old password

          values.user = await UserModel.query().findById(values.userId).select(
            'encrypted_rehashed_login_hash',

            'encrypted_new_email',
            'email_verification_code',

            'customer_id',
          );

          checkRedlockSignalAborted(signals);

          const passwordHashValues = getPasswordHashValues(
            decryptRehashedLoginHash(
              values.user!.encrypted_rehashed_login_hash,
            ),
          );

          const oldPasswordValues = derivePasswordValues(
            base64ToBytes(values.oldLoginHash),
            passwordHashValues.saltBytes,
          );

          if (
            !equalUint8Arrays(
              oldPasswordValues.hash,
              passwordHashValues.hashBytes,
            )
          ) {
            throw new HttpException(
              'Old password is incorrect.',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (await this.endpointService.isEmailInUse(values)) {
            throw new HttpException(
              'E-mail is already in use.',
              HttpStatus.BAD_REQUEST,
            );
          }

          checkRedlockSignalAborted(signals);

          if (body.emailVerificationCode == null) {
            await this.endpointService.sendVerificationEmail(values);
            return;
          }

          if (values.user == null) {
            throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
          }

          if (
            !(await this.endpointService.checkEmailVerificationCode(values))
          ) {
            throw new HttpException(
              'E-mail verification code is incorrect.',
              HttpStatus.BAD_REQUEST,
            );
          }

          checkRedlockSignalAborted(signals);

          if (
            body.newLoginHash == null ||
            body.encryptedPrivateKeyring == null ||
            body.encryptedSymmetricKeyring == null
          ) {
            return await this.endpointService.getSessionKey(values);
          }

          checkRedlockSignalAborted(signals);

          await this.endpointService.changeUserEmail(values);
        });
      },
    );
  }
}
