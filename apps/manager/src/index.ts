import './env';
import './stripe';

import { decryptUserEmail, hashUserEmail } from '@deeplib/data';
import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
  PageModel,
  SessionModel,
  UserModel,
  UserPageModel,
} from '@deeplib/db';
import {
  sendBrevoMail,
  sendMailjetMail,
  sendSendGridMail,
} from '@deeplib/mail';
import { mainLogger } from '@stdlib/misc';
import { raw } from 'objection';
import readline from 'readline';

import { dataAbstraction } from './data/data-abstraction';
import { initKnex } from './data/knex';
import { stripe } from './stripe';

initKnex();

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showHelp() {
  console.log('Available commands:');
  console.log('- hget <prefix> <suffix> <field>');
  console.log('- hset <prefix> <suffix> <field> <value>');
  console.log('- delete-user <userId>');
  console.log('- hash-email <email>');
  console.log('- send-sendgrid-test-mail <from> <to>');
  console.log('- send-brevo-test-mail <from> <to>');
  console.log('- send-mailjet-test-mail <from> <to>');
  console.log('Enter your commands:');
}

async function handleCommand(command: string) {
  const [commandName, ...args] = command.split(' ');

  try {
    switch (commandName) {
      case 'help':
        showHelp();
        break;
      case 'hget':
        mainLogger.info(
          `Result: ${await dataAbstraction().hget(
            args[0] as any,
            args[1],
            args[2],
          )}`,
        );
        break;
      case 'hset':
        await dataAbstraction().hmset(args[0] as any, args[1], {
          [args[2]]: eval(args[3]),
        });
        break;

      case 'delete-user':
        await deleteUser(args[0]);
        break;

      case 'hash-email':
        mainLogger.info(
          `Result: '\\x${Buffer.from(hashUserEmail(args[0])).toString('hex')}'`,
        );
        break;

      case 'send-sendgrid-test-mail':
        await sendSendGridMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'SendGrid test mail',
          html: 'SendGrid test mail',
        });
        break;
      case 'send-brevo-test-mail':
        await sendBrevoMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'Brevo test mail',
          html: 'Brevo test mail',
        });
        break;
      case 'send-mailjet-test-mail':
        await sendMailjetMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'Mailjet test mail',
          html: 'Mailjet test mail',
        });
        break;
      default:
        mainLogger.error('Command unknown.');
        return;
    }

    mainLogger.info('Command executed successfully.');
  } catch (error) {
    mainLogger.error('Command failed with error: %o', error);
  }
}

async function deleteUser(userId: string) {
  await dataAbstraction().transaction(async (dtrx) => {
    // Check if any group has more than one member

    const memberships = await GroupMemberModel.query(dtrx.trx)
      .where('group_members.user_id', userId)
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
          (count as any).member_count > 1 && (count as any).owner_count <= 1,
      )
    ) {
      throw {
        message:
          'Some groups would be left without an owner. Transfer ownership before deleting your account.',
        code: 'BAD_REQUEST',
      };
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
        .where('user_id', userId)
        .select('group_id'),
      GroupJoinRequestModel.query(dtrx.trx)
        .where('user_id', userId)
        .select('group_id'),

      UserPageModel.query(dtrx.trx).where('user_id', userId).select('page_id'),

      SessionModel.query(dtrx.trx)
        .where('user_id', userId)
        .whereNot('invalidated', true)
        .select('id'),

      UserModel.query(dtrx.trx)
        .findById(userId)
        .select('encrypted_email', 'personal_group_id', 'customer_id'),
    ]);

    if (user == null) {
      throw {
        message: 'User not found',
        code: 'NOT_FOUND',
      };
    }

    // Delete all user data

    await Promise.all([
      ...groupPageIds.map((page) =>
        dataAbstraction().delete('page', page.id, {
          dtrx,
          cacheOnly: true,
        }),
      ),

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
      ...memberships.map((member) =>
        dataAbstraction().delete(
          'group-member',
          `${member.group_id}:${userId}`,
          {
            dtrx,
            cacheOnly: true,
          },
        ),
      ),

      ...idsOfGroupsToDelete.map((groupId) =>
        dataAbstraction().delete('group', groupId, {
          dtrx,
        }),
      ),

      ...visitedPageIds.map((page) =>
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
        decryptUserEmail(user.encrypted_email),
        {
          dtrx,
          cacheOnly: true,
        },
      ),

      dataAbstraction().delete('user', userId, { dtrx }),
    ]);

    // Delete Stripe customer

    if (user?.customer_id != null) {
      await stripe.customers.del(user.customer_id);
    }
  });
}

function requestCommand() {
  readlineInterface.question('', async (command) => {
    if (command === 'exit') {
      readlineInterface.close();
      return;
    }

    await handleCommand(command);

    requestCommand();
  });
}

showHelp();

requestCommand();
