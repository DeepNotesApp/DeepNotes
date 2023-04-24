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
import { raw } from 'objection';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { clearCookies } from 'src/utils/cookies';
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
        // Check correct password

        await checkCorrectUserPassword({
          userId: ctx.userId,
          loginHash: input.loginHash,
        });

        // Check if any group has more than one member

        const memberships = await GroupMemberModel.query(dtrx.trx)
          .where('group_members.user_id', ctx.userId)
          .leftJoin(
            GroupMemberModel.query(dtrx.trx)
              .groupBy('group_id')
              .select('group_id')
              .count('* as member_count')
              .as('member_counts'),
            'group_members.group_id',
            'member_counts.group_id',
          )
          .leftJoin(
            GroupMemberModel.query(dtrx.trx)
              .where('role', 'owner')
              .groupBy('group_id')
              .select('group_id')
              .count('* as owner_count')
              .as('owner_counts'),
            'group_members.group_id',
            'owner_counts.group_id',
          )
          .select(
            'group_members.group_id',
            raw('COALESCE(member_counts.member_count, 0) as member_count'),
            raw('COALESCE(owner_counts.owner_count, 0) as owner_count'),
          );

        if (
          memberships.some(
            (count) =>
              (count as any).member_count > 1 &&
              (count as any).owner_count <= 1,
          )
        ) {
          throw new TRPCError({
            message:
              'Some groups would be left without an owner. Transfer ownership before deleting your account.',
            code: 'BAD_REQUEST',
          });
        }

        const idsOfGroupsToDelete = memberships
          .filter((membership) => (membership as any).member_count <= 1)
          .map((membership) => membership.group_id);

        // Get all user data

        const [
          groupPageIds,
          invitations,
          requests,
          visitedPageIds,
          sessions,
          user,
        ] = await Promise.all([
          PageModel.query(dtrx.trx)
            .whereIn('group_id', idsOfGroupsToDelete)
            .select('pages.id'),

          GroupJoinInvitationModel.query(dtrx.trx)
            .where('user_id', ctx.userId)
            .select('group_id'),
          GroupJoinRequestModel.query(dtrx.trx)
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

        if (user == null) {
          throw new TRPCError({
            message: 'User not found',
            code: 'NOT_FOUND',
          });
        }

        // Delete all user data

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
          ...memberships.map((member) =>
            ctx.dataAbstraction.delete(
              'group-member',
              `${member.group_id}:${ctx.userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),

          ...idsOfGroupsToDelete.map((groupId) =>
            ctx.dataAbstraction.delete('group', groupId, {
              dtrx,
            }),
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

        checkRedlockSignalAborted(signals);

        // Delete Stripe customer

        if (user?.customer_id != null) {
          await ctx.stripe.customers.del(user.customer_id);
        }

        // Clear cookies

        clearCookies(ctx.res);
      });
    },
  );
}
