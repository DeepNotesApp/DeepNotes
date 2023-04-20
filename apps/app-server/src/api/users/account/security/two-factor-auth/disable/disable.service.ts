import { Injectable } from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { dataAbstraction } from 'src/data/data-abstraction';

@Injectable()
export class DisableService {
  async isTwoFactorAuthEnabled(userId: string): Promise<boolean> {
    return await dataAbstraction().hget(
      'user',
      userId,
      'two-factor-auth-enabled',
    );
  }

  async disableTwoFactorAuth(input: { userId: string; dtrx: DataTransaction }) {
    await dataAbstraction().patch(
      'user',
      input.userId,
      {
        two_factor_auth_enabled: false,
        encrypted_authenticator_secret: null,
        encrypted_recovery_codes: null,
      },
      { dtrx: input.dtrx },
    );
  }
}
