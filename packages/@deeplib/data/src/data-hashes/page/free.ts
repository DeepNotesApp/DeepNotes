import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const free: DataField<PageModel> = {
  userGettable: () => true,

  columns: ['free'],
};
