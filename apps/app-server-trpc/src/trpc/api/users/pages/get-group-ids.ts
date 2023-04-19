import { GroupMemberModel } from '@deeplib/db';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const getGroupIdsProcedure = once(() =>
  baseProcedure.query(getGroupIds),
);

export async function getGroupIds({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  return (
    await GroupMemberModel.query()
      .where('user_id', ctx.userId)
      .select('group_id')
      .orderBy('last_activity_date', 'DESC')
  ).map((groupMember) => groupMember.group_id);
}
