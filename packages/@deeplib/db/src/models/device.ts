import { Model } from 'objection';

export class DeviceModel extends Model {
  static override tableName = 'devices';

  id!: string;

  user_id!: string;

  hash!: Uint8Array;

  trusted!: boolean;
}
