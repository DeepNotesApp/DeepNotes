import type { GroupRoleID } from '@deeplib/misc';
import { Model } from 'objection';

export class GroupMemberModel extends Model {
  static override tableName = 'group_members';

  static override idColumn = ['group_id', 'user_id'];

  group_id!: string;
  user_id!: string;

  role!: GroupRoleID;

  encrypted_access_keyring!: Uint8Array | null;
  encrypted_internal_keyring!: Uint8Array;

  encrypted_name!: Uint8Array | null;

  last_activity_date!: Date;
}
