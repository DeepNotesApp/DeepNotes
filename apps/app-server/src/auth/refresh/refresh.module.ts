import { Module } from 'src/nest-plus';

import { RefreshController } from './refresh.controller';
import { RefreshService } from './refresh.service';

@Module({
  controllers: [RefreshController],
  providers: [RefreshService],
})
export class RefreshModule {}
