import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const nextSnapshotDate: DataField<PageModel> = {
  columns: ['next_snapshot_date'],
};
