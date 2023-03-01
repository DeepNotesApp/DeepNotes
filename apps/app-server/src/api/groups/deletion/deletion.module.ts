import { ProPlanGuard } from 'src/api/pro-plan.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { NonPersonalGroupGuard } from '../non-personal-group.guard';
import { DeleteModule } from './delete/delete.module';
import { DeletePermanentlyModule } from './delete-permanently/delete-permanently.module';
import { RestoreModule } from './restore/restore.module';

@UseModuleGuard(NonPersonalGroupGuard)
@UseModuleGuard(ProPlanGuard)
@Module({
  imports: [
    { prefix: 'delete', module: DeleteModule },
    { prefix: 'restore', module: RestoreModule },
    { prefix: 'delete-permanently', module: DeletePermanentlyModule },
  ],
})
export class DeletionModule {}
