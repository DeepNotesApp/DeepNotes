import { Module, UseModuleGuard } from 'src/nest-plus';

import { makePasswordGuard } from '../../password.guard';
import { DisableModule } from './disable/disable.module';
import { EnableModule } from './enable/enable.module';
import { LoadModule } from './load/load.module';
import { UntrustDevicesModule } from './untrust-devices/untrust-devices.module';
import { VerifyModule } from './verify/verify.module';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  imports: [
    { prefix: 'enable', module: EnableModule },
    { prefix: 'disable', module: DisableModule },
    { prefix: 'verify', module: VerifyModule },
    { prefix: 'untrust-devices', module: UntrustDevicesModule },
    { prefix: 'load', module: LoadModule },
  ],
})
export class TwoFactorAuthModule {}
