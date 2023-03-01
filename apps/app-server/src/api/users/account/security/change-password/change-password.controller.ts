import { UserModel } from '@deeplib/db';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { base64ToBytes, isBase64 } from '@stdlib/base64';
import { getPasswordHashValues } from '@stdlib/crypto';
import { equalUint8Arrays } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { derivePasswordValues } from 'src/crypto';
import { usingLocks } from 'src/data/redlock';
import { decryptRehashedLoginHash, Locals } from 'src/utils';

import { ChangePasswordService } from './change-password.service';

class BodyDto extends createZodDto(
  z.object({
    oldLoginHash: z.string().refine(isBase64),
    newLoginHash: z.string().refine(isBase64).optional(),

    encryptedPrivateKeyring: z.string().refine(isBase64).optional(),
    encryptedSymmetricKeyring: z.string().refine(isBase64).optional(),

    requestId: z.string().refine(isBase64).optional(),
  }),
) {}

export type EndpointValues = BodyDto & {
  endpointService: ChangePasswordService;

  userId: string;
  sessionId: string;
};

@Controller()
export class ChangePasswordController {
  constructor(readonly endpointService: ChangePasswordService) {}

  @Post()
  async handle(
    @Locals()
    locals: {
      userId: string;
      sessionId: string;
    },

    @Body() body: BodyDto,
  ) {
    return await usingLocks(
      [[`user-lock:${locals.userId}`]],
      async (signals) => {
        const values: EndpointValues = {
          endpointService: this.endpointService,

          ...locals,
          ...body,
        };

        // Verify old password

        const user = await UserModel.query()
          .findById(values.userId)
          .select('encrypted_rehashed_login_hash');

        checkRedlockSignalAborted(signals);

        const passwordHashValues = getPasswordHashValues(
          decryptRehashedLoginHash(user!.encrypted_rehashed_login_hash),
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

        if (
          body.newLoginHash == null ||
          body.encryptedPrivateKeyring == null ||
          body.encryptedSymmetricKeyring == null
        ) {
          return await this.endpointService.getNecessaryDataForClient(values);
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.updateUserData(values);
      },
    );
  }
}
