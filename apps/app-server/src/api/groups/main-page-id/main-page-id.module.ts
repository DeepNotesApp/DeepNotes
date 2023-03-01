import { Module } from 'src/nest-plus';

import { MainPageIdController } from './main-page-id.controller';

@Module({
  controllers: [MainPageIdController],
  providers: [],
})
export class MainPageIdModule {}
