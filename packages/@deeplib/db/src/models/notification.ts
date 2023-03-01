import { Model } from 'objection';

export class NotificationModel extends Model {
  static override tableName = 'notifications';

  id!: number;

  type!: string;

  encrypted_content!: Uint8Array;

  datetime!: Date;
}
