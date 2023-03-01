import { Model } from 'objection';

export class GroupJoinRequestModel extends Model {
  static override tableName = 'group_join_requests';

  static override idColumn = ['group_id', 'user_id'];

  group_id!: string;
  user_id!: string;

  encrypted_name!: Uint8Array;
  encrypted_name_for_user!: Uint8Array;

  rejected!: boolean;

  creation_date!: Date;
}
