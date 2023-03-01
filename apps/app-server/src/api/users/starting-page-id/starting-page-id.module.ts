import { Module } from 'src/nest-plus';

import { StartingPageIdController } from './starting-page-id.controller';

@Module({
  controllers: [StartingPageIdController],
})
export class StartingPageIdModule {}
