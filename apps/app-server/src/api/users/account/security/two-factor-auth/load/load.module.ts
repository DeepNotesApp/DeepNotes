import { Module } from 'src/nest-plus';

import { LoadController } from './load.controller';

@Module({
  controllers: [LoadController],
  providers: [],
})
export class LoadModule {}
