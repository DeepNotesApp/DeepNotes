import { Module } from 'src/nest-plus';

import { RestoreController } from './restore.controller';
import { RestoreService } from './restore.service';

@Module({
  controllers: [RestoreController],
  providers: [RestoreService],
})
export class RestoreModule {}
