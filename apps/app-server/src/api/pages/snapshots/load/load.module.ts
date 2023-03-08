import { Module } from '@stdlib/nestjs';

import { LoadController } from './load.controller';
import { LoadService } from './load.service';

@Module({
  controllers: [LoadController],
  providers: [LoadService],
})
export class LoadModule {}
