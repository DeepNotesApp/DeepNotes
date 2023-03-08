import { Module } from '@stdlib/nestjs';

import { VerifyEmailController } from './verify-email.controller';
import { VerifyEmailService } from './verify-email.service';

@Module({
  controllers: [VerifyEmailController],
  providers: [VerifyEmailService],
})
export class VerifyEmailModule {}
