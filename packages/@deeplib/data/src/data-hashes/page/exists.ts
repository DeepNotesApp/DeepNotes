import type { PageModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const exists: DataField<PageModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['id', 'permanent_deletion_date'],

  get: ({ model }) =>
    model?.id != null &&
    (model.permanent_deletion_date == null ||
      model.permanent_deletion_date > new Date()),
};
