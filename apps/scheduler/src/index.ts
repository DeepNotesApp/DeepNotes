import './env';

import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  GroupModel,
  PageModel,
} from '@deeplib/db';

import { dataAbstraction } from './data/data-abstraction';
import { initKnex } from './data/knex';

initKnex();

async function cleanDeletedObjects() {
  const [
    permanentlyDeletedPages,

    groupJoinInvitations,
    groupJoinRequests,
    groupMembers,

    permanentlyDeletedGroups,
  ] = await Promise.all([
    PageModel.query()
      .join('groups', 'groups.id', 'pages.group_id')
      .where('pages.permanent_deletion_date', '>', new Date())
      .orWhere('groups.permanent_deletion_date', '>', new Date())
      .select('pages.id'),

    GroupJoinInvitationModel.query()
      .join('groups', 'groups.id', 'group_join_invitations.group_id')
      .where('groups.permanent_deletion_date', '>', new Date()),
    GroupJoinRequestModel.query()
      .join('groups', 'groups.id', 'group_join_requests.group_id')
      .where('groups.permanent_deletion_date', '>', new Date()),
    GroupMemberModel.query()
      .join('groups', 'groups.id', 'group_members.group_id')
      .where('groups.permanent_deletion_date', '>', new Date()),

    GroupModel.query()
      .where('permanent_deletion_date', '>', new Date())
      .select('id'),
  ]);

  await dataAbstraction().transaction(async (dtrx) => {
    await Promise.all([
      ...permanentlyDeletedPages.map((page) =>
        dataAbstraction().delete('page-snaphots', page.id, { dtrx }),
      ),
      ...permanentlyDeletedPages.map((page) =>
        dataAbstraction().delete('page', page.id, { dtrx }),
      ),

      ...groupJoinInvitations.map((invitation) =>
        dataAbstraction().delete(
          'group-join-invitation',
          `${invitation.group_id}:${invitation.user_id}`,
          { dtrx, cacheOnly: true },
        ),
      ),
      ...groupJoinRequests.map((request) =>
        dataAbstraction().delete(
          'group-join-request',
          `${request.group_id}:${request.user_id}`,
          { dtrx, cacheOnly: true },
        ),
      ),
      ...groupMembers.map((member) =>
        dataAbstraction().delete(
          'group-member',
          `${member.group_id}:${member.user_id}`,
          { dtrx, cacheOnly: true },
        ),
      ),

      ...permanentlyDeletedGroups.map((group) =>
        dataAbstraction().delete('group', group.id, { dtrx }),
      ),
    ]);
  });
}

void cleanDeletedObjects();

setInterval(cleanDeletedObjects, 24 * 60 * 60 * 1000);
