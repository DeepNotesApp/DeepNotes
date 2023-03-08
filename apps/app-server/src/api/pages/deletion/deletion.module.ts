import { Module } from '@stdlib/nestjs';

import { DeleteModule } from './delete/delete.module';
import { DeletePermanentlyModule } from './delete-permanently/delete-permanently.module';
import { RestoreModule } from './restore/restore.module';

@Module({
  imports: [
    { prefix: 'delete', module: DeleteModule },
    { prefix: 'restore', module: RestoreModule },
    { prefix: 'delete-permanently', module: DeletePermanentlyModule },
  ],
})
export class DeletionModule {}
