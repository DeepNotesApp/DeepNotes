import { Module } from 'src/nest-plus';

import { SendController } from './send.controller';
import { SendService } from './send.service';

@Module({
  controllers: [SendController],
  providers: [SendService],
})
export class SendModule {}
