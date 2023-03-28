import { validateDataHashes } from '@stdlib/data/src/universal';

import { customer } from './customer';
import { email } from './email';
import { group } from './group';
import { groupJoinInvitation } from './group-join-invitation';
import { groupJoinRequest } from './group-join-request';
import { groupMember } from './group-member';
import { page } from './page';
import { pageBacklinks } from './page-backlinks';
import { pageSnapshots } from './page-snapshots';
import { session } from './session';
import { user } from './user';
import { userPage } from './user-page';

export const dataHashes = validateDataHashes({
  customer: customer,
  email: email,
  group: group,
  'group-join-invitation': groupJoinInvitation,
  'group-join-request': groupJoinRequest,
  'group-member': groupMember,
  page: page,
  'page-backlinks': pageBacklinks,
  'page-snaphots': pageSnapshots,
  session: session,
  user: user,
  'user-page': userPage,
});

export type DataPrefix = keyof typeof dataHashes;
