import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { ProPlanGuard } from 'src/api/pro-plan.guard';

import { NonPersonalGroupGuard } from '../non-personal-group.guard';
import { ChangeModule } from './change/change.module';
import { DisableModule } from './disable/disable.module';
import { EnableModule } from './enable/enable.module';

@UseModuleGuard(NonPersonalGroupGuard)
@UseModuleGuard(ProPlanGuard)
@Module({
  imports: [
    { prefix: 'enable', module: EnableModule },
    { prefix: 'disable', module: DisableModule },
    { prefix: 'change', module: ChangeModule },
  ],
})
export class PasswordModule {}
