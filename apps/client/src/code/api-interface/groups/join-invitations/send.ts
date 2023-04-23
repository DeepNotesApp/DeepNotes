import type { GroupRoleID } from '@deeplib/misc';
import { createKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import type {
  sendProcedureStep1,
  sendProcedureStep2,
} from 'deepnotes-app-server-trpc/src/websocket/groups/join-invitations/send';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function sendJoinInvitation(input: {
  groupId: string;
  inviteeUserId: string;
  inviteeRole: GroupRoleID;
  inviteeUserName: string;
}) {
  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_TRPC_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinInvitations.send`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    typeof sendProcedureStep1['_def']['_input_in']
  > {
    const [
      inviteePublicKeyring,
      groupPublicKeyring,

      accessKeyring,
      groupInternalKeyring,
    ] = await Promise.all([
      (async () =>
        createKeyring(
          await internals.realtime.hget(
            'user',
            input.inviteeUserId,
            'public-keyring',
          ),
        ))(),
      (async () =>
        createKeyring(
          await internals.realtime.hget(
            'group',
            input.groupId,
            'public-keyring',
          ),
        ))(),

      groupAccessKeyrings()(input.groupId).getAsync(),
      groupInternalKeyrings()(input.groupId).getAsync(),
    ]);

    if (accessKeyring == null || groupInternalKeyring == null) {
      throw new Error('Group keyrings not found.');
    }

    return {
      groupId: input.groupId,

      patientId: input.inviteeUserId,
      invitationRole: input.inviteeRole,

      encryptedAccessKeyring: accessKeyring.wrapAsymmetric(
        internals.keyPair,
        inviteePublicKeyring,
      ).wrappedValue,
      encryptedInternalKeyring: groupInternalKeyring.wrapAsymmetric(
        internals.keyPair,
        inviteePublicKeyring,
      ).wrappedValue,

      userEncryptedName: internals.keyPair.encrypt(
        textToBytes(input.inviteeUserName),
        groupPublicKeyring,
        { padding: true },
      ),
    };
  }

  async function step2(
    input_: typeof sendProcedureStep1['_def']['_output_out'],
  ): Promise<typeof sendProcedureStep2['_def']['_input_in']> {
    const [groupName, agentName] = await Promise.all([
      groupNames()(input.groupId).getAsync(),
      groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    ]);

    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        patientId: input.inviteeUserId,

        notifications: {
          agent: {
            groupId: input.groupId,

            patientId: input.inviteeUserId,
            groupName: groupName.text,
            targetName: input.inviteeUserName,

            // You invited ${targetName} to join the group.
          },

          target: {
            groupId: input.groupId,

            groupName: groupName.text,

            // Your were invited to join the group.
          },

          observers: {
            groupId: input.groupId,

            groupName: groupName.text,
            agentName: agentName.text,
            targetName: input.inviteeUserName,

            // ${agentName} invited ${targetName} to join the group.
          },
        },
      }),
    };
  }

  async function step3(
    _input: typeof sendProcedureStep2['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
