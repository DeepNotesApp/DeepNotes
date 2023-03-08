import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { ProPlanGuard } from 'src/api/pro-plan.guard';

import { NonPersonalGroupGuard } from '../non-personal-group.guard';
import { LoadSettingsController } from './load-settings.controller';

@UseModuleGuard(NonPersonalGroupGuard)
@UseModuleGuard(ProPlanGuard)
@Module({
  controllers: [LoadSettingsController],
  providers: [],
})
export class LoadSettingsModule {}
