import { Module } from '@stdlib/nestjs';

import { UntrustDevicesController } from './untrust-devices.controller';

@Module({
  controllers: [UntrustDevicesController],
})
export class UntrustDevicesModule {}
