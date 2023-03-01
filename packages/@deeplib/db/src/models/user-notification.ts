import { Model } from 'objection';

export class UserNotificationModel extends Model {
  static override tableName = 'users_notifications';

  static override idColumn = ['user_id', 'notification_id'];

  user_id!: string;
  notification_id!: number;

  encrypted_symmetric_key!: Uint8Array;
}
