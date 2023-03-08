import { Module } from '@stdlib/nestjs';

import { DataController } from './data.controller';

@Module({
  controllers: [DataController],
})
export class DataModule {}
