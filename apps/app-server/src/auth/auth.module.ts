import { Module } from '@stdlib/nestjs';

import { LoginModule } from './login/login.module';
import { LogoutModule } from './logout/logout.module';
import { RefreshModule } from './refresh/refresh.module';
import { RegisterModule } from './register/register.module';
import { VerifyEmailModule } from './verify-email/verify-email.module';

@Module({
  imports: [
    { prefix: 'login', module: LoginModule },
    { prefix: 'register', module: RegisterModule },
    { prefix: 'refresh', module: RefreshModule },
    { prefix: 'verify-email', module: VerifyEmailModule },
    { prefix: 'logout', module: LogoutModule },
  ],
})
export class AuthModule {}
