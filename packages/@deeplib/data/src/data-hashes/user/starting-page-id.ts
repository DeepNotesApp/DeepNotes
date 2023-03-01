import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const startingPageId: DataField<UserModel> = {
  userGettable: ({ userId, suffix }) => userId === suffix,

  columns: ['starting_page_id'],
};
