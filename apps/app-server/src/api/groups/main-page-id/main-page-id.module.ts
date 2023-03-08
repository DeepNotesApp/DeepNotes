import { Module } from '@stdlib/nestjs';

import { MainPageIdController } from './main-page-id.controller';

@Module({
  controllers: [MainPageIdController],
  providers: [],
})
export class MainPageIdModule {}
