import { Module } from 'src/nest-plus';

import { ChangePasswordModule } from './change-password/change-password.module';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';

@Module({
  imports: [
    { prefix: 'change-password', module: ChangePasswordModule },
    { prefix: 'two-factor-auth', module: TwoFactorAuthModule },
  ],
})
export class SecurityModule {}
