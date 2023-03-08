import { Module } from '@stdlib/nestjs';

import { ChangeEmailController } from './change-email.controller';
import { ChangeEmailService } from './change-email.service';

@Module({
  controllers: [ChangeEmailController],
  providers: [ChangeEmailService],
})
export class ChangeEmailModule {}
