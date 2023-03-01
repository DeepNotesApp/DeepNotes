import { Module } from 'src/nest-plus';

import { RejectController } from './reject.controller';
import { RejectService } from './reject.service';

@Module({
  controllers: [RejectController],
  providers: [RejectService],
})
export class RejectModule {}
