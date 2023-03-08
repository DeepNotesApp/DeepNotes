import { Module, UseModuleGuard } from '@stdlib/nestjs';
import { DemoGuard } from 'src/api/demo.guard';

import { GeneralModule } from './general/general.module';
import { SecurityModule } from './security/security.module';

@UseModuleGuard(DemoGuard)
@Module({
  imports: [
    { prefix: 'security', module: SecurityModule },
    { prefix: 'general', module: GeneralModule },
  ],
})
export class AccountModule {}
