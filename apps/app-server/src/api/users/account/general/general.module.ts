import { Module } from '@stdlib/nestjs';

import { ChangeEmailModule } from './change-email/change-email.module';
import { DeleteModule } from './delete/delete.module';

@Module({
  imports: [
    { prefix: 'change-email', module: ChangeEmailModule },
    { prefix: 'delete', module: DeleteModule },
  ],
})
export class GeneralModule {}
