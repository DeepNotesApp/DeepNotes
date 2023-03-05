import { DemoGuard } from 'src/api/demo.guard';
import { Module, UseModuleGuard } from 'src/nest-plus';

import { DeleteModule } from './delete/delete.module';
import { GeneralModule } from './general/general.module';
import { SecurityModule } from './security/security.module';

@UseModuleGuard(DemoGuard)
@Module({
  imports: [
    { prefix: 'security', module: SecurityModule },
    { prefix: 'general', module: GeneralModule },
    { prefix: 'delete', module: DeleteModule },
  ],
})
export class AccountModule {}
