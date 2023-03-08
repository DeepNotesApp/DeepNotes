import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { ProPlanGuard } from 'src/api/pro-plan.guard';

import { DeleteModule } from './delete/delete.module';
import { LoadModule } from './load/load.module';
import { SaveModule } from './save/save.module';

@UseModuleGuard(ProPlanGuard)
@Module({
  imports: [
    { prefix: 'load', module: LoadModule },
    { prefix: 'save', module: SaveModule },
    { prefix: 'delete', module: DeleteModule },
  ],
})
export class SnapshotsModule {}
