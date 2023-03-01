import { Module } from 'src/nest-plus';

import { DataController } from './data.controller';

@Module({
  controllers: [DataController],
})
export class DataModule {}
