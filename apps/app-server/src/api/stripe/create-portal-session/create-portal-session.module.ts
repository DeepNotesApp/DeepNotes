import { Module } from 'src/nest-plus';

import { CreatePortalSessionController } from './create-portal-session.controller';

@Module({
  controllers: [CreatePortalSessionController],
  providers: [],
})
export class CreatePortalSessionModule {}
