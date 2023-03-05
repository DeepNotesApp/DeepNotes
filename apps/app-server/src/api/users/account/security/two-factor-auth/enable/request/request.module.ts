import { Module } from 'src/nest-plus';

import { RequestController } from './request.controller';
import { RequestService } from './request.service';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}
