import { Model } from 'objection';

export class PageModel extends Model {
  static override tableName = 'pages';

  id!: string;

  encrypted_relative_title!: Uint8Array;
  encrypted_absolute_title!: Uint8Array;

  group_id!: string;

  creation_date!: Date;
  last_activity_date!: Date;

  encrypted_symmetric_keyring!: Uint8Array;

  free!: boolean;

  next_snapshot_date!: Date;
  next_snapshot_update_index!: number;

  next_key_rotation_date!: Date;

  permanent_deletion_date!: Date | null;
}
