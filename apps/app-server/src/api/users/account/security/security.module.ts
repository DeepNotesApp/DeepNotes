import { Module } from '@stdlib/nestjs';

import { ChangePasswordModule } from './change-password/change-password.module';
import { RotateKeysModule } from './rotate-keys/rotate-keys.module';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';

@Module({
  imports: [
    { prefix: 'change-password', module: ChangePasswordModule },
    { prefix: 'two-factor-auth', module: TwoFactorAuthModule },
    { prefix: 'rotate-keys', module: RotateKeysModule },
  ],
})
export class SecurityModule {}
