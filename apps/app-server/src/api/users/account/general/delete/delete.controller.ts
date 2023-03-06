import { decryptEmail } from '@deeplib/data';
import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  SessionModel,
  UserModel,
  UserPageModel,
} from '@deeplib/db';
import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { FastifyReply } from 'fastify';
import { clearCookies } from 'src/cookies';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { stripe } from 'src/stripe/stripe';
import { Locals } from 'src/utils';

@Controller()
export class DeleteController {
  @Post()
  async handle(
    @Locals('userId') userId: string,

    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await usingLocks([[`user-lock:${userId}`]], async (signals) => {
      await dataAbstraction().transaction(async (dtrx) => {
        const [invitations, requests, members, pageIds, sessions, user] =
          await Promise.all([
            GroupJoinInvitationModel.query(dtrx.trx)
              .where('user_id', userId)
              .select('group_id'),
            GroupJoinRequestModel.query(dtrx.trx)
              .where('user_id', userId)
              .select('group_id'),
            GroupMemberModel.query(dtrx.trx)
              .where('user_id', userId)
              .select('group_id'),

            UserPageModel.query(dtrx.trx)
              .where('user_id', userId)
              .select('page_id'),

            SessionModel.query(dtrx.trx)
              .where('user_id', userId)
              .whereNot('invalidated', true)
              .select('id'),

            UserModel.query(dtrx.trx)
              .findById(userId)
              .select('encrypted_email', 'personal_group_id', 'customer_id'),
          ]);

        checkRedlockSignalAborted(signals);

        if (user == null) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        await Promise.all([
          ...invitations.map((invitation) =>
            dataAbstraction().delete(
              'group-join-invitation',
              `${invitation.group_id}:${userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),
          ...requests.map((request) =>
            dataAbstraction().delete(
              'group-join-request',
              `${request.group_id}:${userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),
          ...members.map((member) =>
            dataAbstraction().delete(
              'group-member',
              `${member.group_id}:${userId}`,
              { dtrx, cacheOnly: true },
            ),
          ),

          ...pageIds.map((page) =>
            dataAbstraction().delete('user-page', `${userId}:${page.page_id}`, {
              dtrx,
              cacheOnly: true,
            }),
          ),

          ...sessions.map((session) =>
            dataAbstraction().patch(
              'session',
              session.id,
              { invalidated: true },
              { dtrx, cacheOnly: true },
            ),
          ),

          dataAbstraction().delete('group', user.personal_group_id, {
            dtrx,
            cacheOnly: true,
          }),

          ...(user.customer_id != null
            ? [
                dataAbstraction().delete('customer', user.customer_id, {
                  dtrx,
                  cacheOnly: true,
                }),
              ]
            : []),

          dataAbstraction().delete(
            'email',
            decryptEmail(user.encrypted_email),
            {
              dtrx,
              cacheOnly: true,
            },
          ),

          dataAbstraction().delete('user', userId, { dtrx }),
        ]);

        if (user?.customer_id != null) {
          await stripe().customers.del(user.customer_id);
        }

        clearCookies(reply);
      });
    });
  }
}
