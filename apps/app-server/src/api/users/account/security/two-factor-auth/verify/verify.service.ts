import { UserModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { dataAbstraction } from 'src/data/data-abstraction';
import { decryptAuthenticatorSecret, encryptRecoveryCodes } from 'src/utils';

import type { EndpointValues } from './verify.controller';

@Injectable()
export class VerifyService {
  async getAuthenticatorSecret({ userId }: EndpointValues) {
    const user = await UserModel.query()
      .findById(userId)
      .select('encrypted_authenticator_secret');

    return decryptAuthenticatorSecret(user?.encrypted_authenticator_secret!);
  }

  async checkAuthenticatorToken({
    authenticatorToken,
    authenticatorSecret,
  }: EndpointValues) {
    return authenticator.check(authenticatorToken, authenticatorSecret!);
  }

  async finishVerification({ userId, recoveryCodes, dtrx }: EndpointValues) {
    await dataAbstraction().patch(
      'user',
      userId,
      {
        two_factor_auth_enabled: true,
        encrypted_recovery_codes: encryptRecoveryCodes(recoveryCodes!),
      },
      { dtrx },
    );
  }
}
