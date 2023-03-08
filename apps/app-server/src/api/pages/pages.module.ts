import { Module } from '@stdlib/nestjs';

import { BumpModule } from './bump/bump.module';
import { CreateModule } from './create/create.module';
import { DeletionModule } from './deletion/deletion.module';
import { MoveModule } from './move/move.module';
import { SnapshotsModule } from './snapshots/snapshots.module';

@Module({
  imports: [
    { prefix: 'create', module: CreateModule },
    { prefix: ':pageId/bump', module: BumpModule },
    { prefix: ':pageId/move', module: MoveModule },
    { prefix: ':pageId/deletion', module: DeletionModule },
    { prefix: ':pageId/snapshots', module: SnapshotsModule },
  ],
})
export class PagesModule {}
