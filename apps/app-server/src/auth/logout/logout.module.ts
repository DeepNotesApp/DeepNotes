import { Module } from 'src/nest-plus';

import { LogoutController } from './logout.controller';

@Module({
  controllers: [LogoutController],
})
export class LogoutModule {}
