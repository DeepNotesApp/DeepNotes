import { Module } from '@stdlib/nestjs';

import { RefreshController } from './refresh.controller';
import { RefreshService } from './refresh.service';

@Module({
  controllers: [RefreshController],
  providers: [RefreshService],
})
export class RefreshModule {}
