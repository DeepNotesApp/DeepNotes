import { Module, UseModuleGuard } from 'src/nest-plus';

import { makePasswordGuard } from '../../password.guard';
import { DisableModule } from './disable/disable.module';
import { EnableModule } from './enable/enable.module';
import { GenerateRecoveryCodesModule } from './generate-recovery-codes/generate-recovery-codes.module';
import { LoadModule } from './load/load.module';
import { UntrustDevicesModule } from './untrust-devices/untrust-devices.module';

@UseModuleGuard(makePasswordGuard('password'))
@Module({
  imports: [
    { prefix: 'enable', module: EnableModule },
    { prefix: 'disable', module: DisableModule },
    { prefix: 'load', module: LoadModule },
    { prefix: 'untrust-devices', module: UntrustDevicesModule },
    { prefix: 'generate-recovery-codes', module: GenerateRecoveryCodesModule },
  ],
})
export class TwoFactorAuthModule {}
