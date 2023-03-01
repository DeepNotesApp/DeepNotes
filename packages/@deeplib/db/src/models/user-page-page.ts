import { Model } from 'objection';

export class PageLinkModel extends Model {
  static override tableName = 'page_links';

  static override idColumn = ['target_page_id', 'source_page_id', 'user_id'];

  target_page_id!: string;
  source_page_id!: string;
  user_id!: string;

  last_activity_date!: Date;
}
