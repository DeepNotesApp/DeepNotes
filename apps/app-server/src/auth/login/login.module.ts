import { Module } from 'src/nest-plus';

import { LoginController } from './login.controller';
import { LoginService } from './login.service';

@Module({
  controllers: [LoginController],
  providers: [LoginService],
})
export class LoginModule {}
