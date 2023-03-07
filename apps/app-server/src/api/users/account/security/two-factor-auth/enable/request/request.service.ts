import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { dataAbstraction } from 'src/data/data-abstraction';
import { encryptUserAuthenticatorSecret } from 'src/utils';

import type { EndpointValues } from './request.controller';

@Injectable()
export class RequestService {
  async isTwoFactorAuthEnabled({ userId }: EndpointValues): Promise<boolean> {
    return await dataAbstraction().hget(
      'user',
      userId,
      'two-factor-auth-enabled',
    );
  }

  async generateTwoAuthSecret() {
    return authenticator.generateSecret();
  }

  async saveTwoAuthSecretInDb({
    userId,
    authenticatorSecret,
    dtrx,
  }: EndpointValues) {
    await dataAbstraction().patch(
      'user',
      userId,
      {
        encrypted_authenticator_secret: encryptUserAuthenticatorSecret(
          authenticatorSecret!,
        ),
      },
      { dtrx },
    );
  }

  async createResponse({ userId, authenticatorSecret }: EndpointValues) {
    return {
      secret: authenticatorSecret,
      keyUri: authenticator.keyuri(
        await dataAbstraction().hget('user', userId, 'email'),
        'DeepNotes',
        authenticatorSecret!,
      ),
    };
  }
}
