import { Module } from 'src/nest-plus';

import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';

@Module({
  controllers: [VerifyController],
  providers: [VerifyService],
})
export class VerifyModule {}
