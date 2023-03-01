import { Module } from 'src/nest-plus';

import { UntrustDevicesController } from './untrust-devices.controller';

@Module({
  controllers: [UntrustDevicesController],
})
export class UntrustDevicesModule {}
