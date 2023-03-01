import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const mainPageId: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['main_page_id'],
};
