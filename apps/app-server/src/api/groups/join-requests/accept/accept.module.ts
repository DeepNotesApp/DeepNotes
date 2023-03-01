import { Module } from 'src/nest-plus';

import { AcceptController } from './accept.controller';
import { AcceptService } from './accept.service';

@Module({
  controllers: [AcceptController],
  providers: [AcceptService],
})
export class AcceptModule {}
