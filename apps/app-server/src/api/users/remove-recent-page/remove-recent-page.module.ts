import { Module } from 'src/nest-plus';

import { RemoveRecentPageController } from './remove-recent-page.controller';

@Module({
  controllers: [RemoveRecentPageController],
  providers: [],
})
export class RemoveRecentPageModule {}
