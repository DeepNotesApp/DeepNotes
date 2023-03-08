import { Module } from '@stdlib/nestjs';

import { AcceptController } from './accept.controller';
import { AcceptService } from './accept.service';

@Module({
  controllers: [AcceptController],
  providers: [AcceptService],
})
export class AcceptModule {}
