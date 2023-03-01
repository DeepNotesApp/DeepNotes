import { Model } from 'objection';

export class UserPageModel extends Model {
  static override tableName = 'users_pages';

  static override idColumn = ['user_id', 'page_id'];

  user_id!: string;
  page_id!: string;

  last_parent_id!: string | null;
}
