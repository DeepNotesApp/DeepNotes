import { Model } from 'objection';

export class PageUpdateModel extends Model {
  static override tableName = 'page_updates';

  static override idColumn = ['page_id', 'index'];

  page_id!: string;

  index!: number;

  encrypted_data!: Uint8Array;
}
