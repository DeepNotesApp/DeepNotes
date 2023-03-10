import { encryptUserEmail, hashUserEmail } from '@deeplib/data';
import { SessionModel, UserModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  encodePasswordHash,
} from '@stdlib/crypto';
import { randomInt } from 'crypto';
import type { EndpointValues } from 'src/api/users/account/general/change-email/change-email.controller';
import { clearCookies } from 'src/cookies';
import { derivePasswordValues } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { invalidateAllSessions } from 'src/deep-utils';
import { sendMail } from 'src/mail';
import { stripe } from 'src/stripe/stripe';
import { encryptUserRehashedLoginHash, padZeroes } from 'src/utils';

@Injectable()
export class ChangeEmailService {
  async isEmailInUse({ newEmail }: EndpointValues) {
    return (
      (await UserModel.query()
        .where('email_hash', Buffer.from(hashUserEmail(newEmail)))
        .select(1)
        .first()) != null
    );
  }

  async sendVerificationEmail({ userId, newEmail, dtrx }: EndpointValues) {
    const emailVerificationCode = padZeroes(randomInt(0, 1000000), 6);

    await dataAbstraction().patch(
      'user',
      userId,
      {
        encrypted_new_email: encryptUserEmail(newEmail),
        email_verification_code: emailVerificationCode,
      },
      { dtrx },
    );

    await sendMail({
      from: {
        name: 'DeepNotes',
        email: 'account@deepnotes.app',
      },
      to: [newEmail],
      subject: 'Verify your email address',
      html: `
        Use the following code to verify your email address: <b>${emailVerificationCode}</b>.<br/>
        If you did not request this action, you can safely ignore this email.
      `,
    });
  }

  async checkEmailVerificationCode({
    user,
    newEmail,
    emailVerificationCode,
  }: EndpointValues) {
    return (
      user?.encrypted_new_email === encryptUserEmail(newEmail) &&
      user?.email_verification_code === emailVerificationCode
    );
  }

  async getSessionKey({ sessionId }: EndpointValues) {
    const session = await SessionModel.query()
      .findById(sessionId)
      .select('sessions.encryption_key');

    return {
      sessionKey: bytesToBase64(session!.encryption_key),
    };
  }

  async changeUserEmail({
    userId,
    user,

    newEmail,

    newLoginHash,

    encryptedPrivateKeyring,
    encryptedSymmetricKeyring,

    dtrx,

    reply,
  }: EndpointValues) {
    const passwordValues = derivePasswordValues(base64ToBytes(newLoginHash!));

    await Promise.all([
      dataAbstraction().patch(
        'user',
        userId,
        {
          encrypted_email: encryptUserEmail(newEmail),
          email_hash: hashUserEmail(newEmail),

          encrypted_new_email: null,
          email_verification_code: null,

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
          }).fullValue,
          encrypted_symmetric_keyring: createSymmetricKeyring(
            base64ToBytes(encryptedSymmetricKeyring!),
          ).wrapSymmetric(passwordValues.key, {
            associatedData: {
              context: 'UserEncryptedSymmetricKeyring',
              userId,
            },
          }).fullValue,
        },
        { dtrx },
      ),

      invalidateAllSessions(user!.id, { dtrx }),
    ]);

    await stripe().customers.update(user!.customer_id!, {
      email: newEmail,
    });

    clearCookies(reply);
  }
}
