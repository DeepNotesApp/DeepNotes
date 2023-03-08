import { Module } from '@stdlib/nestjs';

import { LoadSettingsController } from './load-settings.controller';

@Module({
  controllers: [LoadSettingsController],
})
export class LoadSettingsModule {}
