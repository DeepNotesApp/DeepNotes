import { Module } from '@stdlib/nestjs';

import { CancelController } from './cancel.controller';
import { CancelService } from './cancel.service';

@Module({
  controllers: [CancelController],
  providers: [CancelService],
})
export class CancelModule {}
