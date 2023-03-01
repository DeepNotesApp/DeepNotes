import { Model } from 'objection';

export class SessionModel extends Model {
  static override tableName = 'sessions';

  id!: string;

  user_id!: string;
  device_id!: string;

  encryption_key!: Uint8Array;

  refresh_code!: string;

  invalidated!: boolean;

  creation_date!: Date;
  last_refresh_date!: Date;
  expiration_date!: Date;
}
