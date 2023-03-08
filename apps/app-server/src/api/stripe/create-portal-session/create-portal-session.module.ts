import { Module } from '@stdlib/nestjs';

import { CreatePortalSessionController } from './create-portal-session.controller';

@Module({
  controllers: [CreatePortalSessionController],
  providers: [],
})
export class CreatePortalSessionModule {}
