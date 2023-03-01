import { Module } from 'src/nest-plus';

import { LoadSettingsController } from './load-settings.controller';

@Module({
  controllers: [LoadSettingsController],
})
export class LoadSettingsModule {}
