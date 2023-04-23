import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
} from '@deeplib/db';
import { isNanoID } from '@stdlib/misc';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    groupId: z.string().refine(isNanoID),
  }),
);

export const getUserIdsProcedure = once(() => baseProcedure.query(getUserIds));

export async function getUserIds({
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  const groupUsers = await GroupMemberModel.query()
    .where('group_id', input.groupId)
    .select('user_id')
    .union(
      GroupJoinRequestModel.query()
        .where('group_id', input.groupId)
        .select('user_id'),
    )
    .union(
      GroupJoinInvitationModel.query()
        .where('group_id', input.groupId)
        .select('user_id'),
    );

  return groupUsers.map((groupUser) => groupUser.user_id);
}