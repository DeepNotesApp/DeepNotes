import { SessionModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { bytesToBase64 } from '@stdlib/base64';
import { base64ToBytes } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import { clearCookies } from 'src/cookies';
import { derivePasswordValues } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { invalidateAllSessions } from 'src/deep-utils';
import { encryptUserRehashedLoginHash } from 'src/utils';

import type { EndpointValues } from './change-password.controller';

@Injectable()
export class ChangePasswordService {
  async getNecessaryDataForClient({ sessionId }: EndpointValues) {
    const userSession = (await SessionModel.query()
      .findById(sessionId)
      .leftJoin('users', 'users.id', 'sessions.user_id')
      .select('sessions.encryption_key'))! as unknown as Pick<
      SessionModel,
      'encryption_key'
    >;

    return {
      sessionKey: bytesToBase64(userSession.encryption_key),
    };
  }

  async updateUserData({
    userId,

    newLoginHash,

    encryptedPrivateKeyring,
    encryptedSymmetricKeyring,

    dtrx,

    reply,
  }: EndpointValues) {
    const passwordValues = derivePasswordValues(base64ToBytes(newLoginHash!));

    await dataAbstraction().patch(
      'user',
      userId,
      {
        encrypted_rehashed_login_hash: encryptUserRehashedLoginHash(
          encodePasswordHash(passwordValues.hash, passwordValues.salt, 2, 32),
        ),

        encrypted_private_keyring: createPrivateKeyring(
          base64ToBytes(encryptedPrivateKeyring!),
        ).wrapSymmetric(passwordValues.key, {
          associatedData: {
            context: 'UserEncryptedPrivateKeyring',
            userId,
          },
        }).wrappedValue,
        encrypted_symmetric_keyring: createSymmetricKeyring(
          base64ToBytes(encryptedSymmetricKeyring!),
        ).wrapSymmetric(passwordValues.key, {
          associatedData: {
            context: 'UserEncryptedSymmetricKeyring',
            userId,
          },
        }).wrappedValue,
      },
      { dtrx },
    );

    await invalidateAllSessions(userId, { dtrx });

    clearCookies(reply);
  }
}
