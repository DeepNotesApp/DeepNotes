import { Module } from 'src/nest-plus';

import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';

@Module({
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}
