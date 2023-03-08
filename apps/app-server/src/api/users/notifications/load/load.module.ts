import { Module } from '@stdlib/nestjs';

import { LoadController } from './load.controller';

@Module({
  controllers: [LoadController],
  providers: [],
})
export class LoadModule {}
