import { Module } from '@stdlib/nestjs';

import { StartingPageIdController } from './starting-page-id.controller';

@Module({
  controllers: [StartingPageIdController],
})
export class StartingPageIdModule {}
