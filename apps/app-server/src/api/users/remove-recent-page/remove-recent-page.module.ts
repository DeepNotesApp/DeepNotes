import { Module } from '@stdlib/nestjs';

import { RemoveRecentPageController } from './remove-recent-page.controller';

@Module({
  controllers: [RemoveRecentPageController],
  providers: [],
})
export class RemoveRecentPageModule {}
