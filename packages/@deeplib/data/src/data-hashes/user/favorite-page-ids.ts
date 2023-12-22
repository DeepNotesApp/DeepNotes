import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const favoritePageIds: DataField<UserModel> = {
  notifyUpdates: true,

  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['favorite_page_ids'],
};
