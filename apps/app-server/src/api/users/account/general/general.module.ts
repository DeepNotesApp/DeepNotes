import { Module } from 'src/nest-plus';

import { ChangeEmailModule } from './change-email/change-email.module';
import { DeleteModule } from './delete/delete.module';

@Module({
  imports: [
    { prefix: 'change-email', module: ChangeEmailModule },
    { prefix: 'delete', module: DeleteModule },
  ],
})
export class GeneralModule {}
