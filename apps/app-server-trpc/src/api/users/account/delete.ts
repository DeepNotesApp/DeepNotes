import { decryptUserEmail } from '@deeplib/data';
import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  PageModel,
  SessionModel,
  UserModel,
  UserPageModel,
} from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { TRPCError } from '@trpc/server';
import { once } from 'lodash';
import { clearCookies } from 'src/cookies';
import { stripe } from 'src/stripe';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { checkCorrectUserPassword } from 'src/utils/users';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z.object({
    loginHash: z.instanceof(Uint8Array),
  }),
);

export const deleteProcedure = once(() => baseProcedure.mutation(delete_));

export async function delete_({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      return await ctx.dataAbstraction.transaction(async (dtrx) => {
        await checkCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.loginHash,
        });

        const [
          groupPageIds,
          invitations,
          requests,
          members,
          visitedPageIds,
          sessions,
          user,
        ] = await Promise.all([
          PageModel.query(dtrx.trx)
            .join('users', 'users.personal_group_id', 'pages.group_id')
            .where('users.id', ctx.userId)
            .select('pages.id'),

          GroupJoinInvitationModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .select('group_id'),
          GroupJoinRequestModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .select('group_id'),
          GroupMemberModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .select('group_id'),

          UserPageModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .select('page_id'),

          SessionModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .whereNot('invalidated', true)
            .select('id'),

          UserModel.query(dtrx.trx)
            .findById(ctx.userId)
            .select('encrypted_email', 'personal_group_id', 'customer_id'),
        ]);

        checkRedlockSignalAborted(signals);

        if (user == null) {
          throw new TRPCError({
            message: 'User not found',
            code: 'NOT_FOUND',
          });
        }

        await Promise.all([
          ...groupPageIds.map((page) =>
            ctx.dataAbstraction.delete('page', page.id, {
              dtrx,
              cacheOnly: true,
            }),
          ),

          ...invitations.map((invitation) =>
            ctx.dataAbstraction.delete(
              'group-join-invitation',
              `${invitation.group_id}:${ctx.userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),
          ...requests.map((request) =>
            ctx.dataAbstraction.delete(
              'group-join-request',
              `${request.group_id}:${ctx.userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),
          ...members.map((member) =>
            ctx.dataAbstraction.delete(
              'group-member',
              `${member.group_id}:${ctx.userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),

          ...visitedPageIds.map((page) =>
            ctx.dataAbstraction.delete(
              'user-page',
              `${ctx.userId}:${page.page_id}`,
              {
                dtrx,
                cacheOnly: true,
              },
            ),
          ),

          ...sessions.map((session) =>
            ctx.dataAbstraction.patch(
              'session',
              session.id,
              { invalidated: true },
              { dtrx, cacheOnly: true },
            ),
          ),

          ctx.dataAbstraction.delete('group', user.personal_group_id, {
            dtrx,
            cacheOnly: true,
          }),

          ...(user.customer_id != null
            ? [
                ctx.dataAbstraction.delete('customer', user.customer_id, {
                  dtrx,
                  cacheOnly: true,
                }),
              ]
            : []),

          ctx.dataAbstraction.delete(
            'email',
            decryptUserEmail(user.encrypted_email),
            {
              dtrx,
              cacheOnly: true,
            },
          ),

          ctx.dataAbstraction.delete('user', ctx.userId, { dtrx }),
        ]);

        if (user?.customer_id != null) {
          await stripe.customers.del(user.customer_id);
        }

        clearCookies(ctx.res);
      });
    },
  );
}
