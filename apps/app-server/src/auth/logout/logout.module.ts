import { Module } from '@stdlib/nestjs';

import { LogoutController } from './logout.controller';

@Module({
  controllers: [LogoutController],
})
export class LogoutModule {}
