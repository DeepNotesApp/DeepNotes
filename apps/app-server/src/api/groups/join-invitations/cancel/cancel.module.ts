import { Module } from 'src/nest-plus';

import { CancelController } from './cancel.controller';
import { CancelService } from './cancel.service';

@Module({
  controllers: [CancelController],
  providers: [CancelService],
})
export class CancelModule {}
