import { Module } from 'src/nest-plus';

import { LoadController } from './load.controller';
import { LoadService } from './load.service';

@Module({
  controllers: [LoadController],
  providers: [LoadService],
})
export class LoadModule {}
