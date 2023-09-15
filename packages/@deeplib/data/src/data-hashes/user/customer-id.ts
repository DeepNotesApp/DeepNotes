import type { UserModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const customerId: DataField<UserModel> = {
  cacheLocally: true, // Reason: Field never changes

  columns: ['customer_id'],
};
