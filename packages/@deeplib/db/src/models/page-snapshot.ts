import type { PageSnapshotType } from '@deeplib/misc';
import { Model } from 'objection';

export class PageSnapshotModel extends Model {
  static override tableName = 'page_snapshots';

  static override idColumn = ['id'];

  id!: string;

  page_id!: string;

  creation_date!: Date;

  author_id!: string;

  encrypted_symmetric_key!: Uint8Array;
  encrypted_data!: Uint8Array;

  type!: PageSnapshotType;
}
