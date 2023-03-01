import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const nextSnapshotUpdateIndex: DataField<PageModel> = {
  columns: ['next_snapshot_update_index'],
};
