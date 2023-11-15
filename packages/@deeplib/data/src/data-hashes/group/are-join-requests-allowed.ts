import type { GroupModel } from '@deeplib/db';
import type { DataField } from '@stdlib/data';

export const areJoinRequestsAllowed: DataField<GroupModel> = {
  notifyUpdates: true,

  userGettable: () => true,

  columns: ['are_join_requests_allowed'],

  get: ({ model }) => model?.are_join_requests_allowed === true,
};
