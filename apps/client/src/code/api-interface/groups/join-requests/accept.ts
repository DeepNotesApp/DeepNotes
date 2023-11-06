import type { GroupRoleID } from '@deeplib/misc';
import type {
  acceptProcedureStep1,
  acceptProcedureStep2,
} from '@deepnotes/app-server/src/websocket/groups/join-requests/accept';
import { createKeyring } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names';
import { createNotifications } from 'src/code/pages/utils';
import { createWebsocketRequest } from 'src/code/utils/websocket-requests';

export async function acceptJoinRequest(input: {
  groupId: string;
  patientId: string;
  targetRole: GroupRoleID;
}) {
  const [
    accessKeyring,
    groupInternalKeyring,

    userPublicKeyring,

    groupName,
    agentName,
    targetName,
  ] = await Promise.all([
    groupAccessKeyrings()(input.groupId).getAsync(),
    groupInternalKeyrings()(input.groupId).getAsync(),

    (async () =>
      createKeyring(
        await internals.realtime.hget(
          'user',
          input.patientId,
          'public-keyring',
        ),
      ))(),

    groupNames()(input.groupId).getAsync(),
    groupMemberNames()(`${input.groupId}:${authStore().userId}`).getAsync(),
    groupRequestNames()(`${input.groupId}:${input.patientId}`).getAsync(),
  ]);

  const { promise } = createWebsocketRequest({
    url: `${process.env.APP_SERVER_URL.replaceAll(
      'http',
      'ws',
    )}/groups.joinRequests.accept`,

    steps: [step1, step2, step3],
  });

  async function step1(): Promise<
    (typeof acceptProcedureStep1)['_def']['_input_in']
  > {
    if (accessKeyring == null || groupInternalKeyring == null) {
      throw new Error('Group keyrings not found.');
    }

    return {
      groupId: input.groupId,

      patientId: input.patientId,
      targetRole: input.targetRole,

      encryptedAccessKeyring: accessKeyring.wrapAsymmetric(
        internals.keyPair,
        userPublicKeyring,
      ).wrappedValue,
      encryptedInternalKeyring: groupInternalKeyring.wrapAsymmetric(
        internals.keyPair,
        userPublicKeyring,
      ).wrappedValue,
    };
  }

  async function step2(
    input_: (typeof acceptProcedureStep1)['_def']['_output_out'],
  ): Promise<(typeof acceptProcedureStep2)['_def']['_input_in']> {
    return {
      notifications: await createNotifications({
        recipients: input_.notificationRecipients,

        patientId: input.patientId,

        notifications: {
          agent: {
            groupId: input.groupId,

            groupName: groupName.text,
            targetName: targetName.text,

            // You have accepted the join request of ${targetName}.
          },

          target: {
            groupId: input.groupId,

            groupName: groupName.text,

            // Your join request was accepted.
          },

          observers: {
            groupId: input.groupId,

            groupName: groupName.text,
            agentName: agentName.text,
            targetName: targetName.text,

            // ${agentName} has accepted the join request of ${targetName}.
          },
        },
      }),
    };
  }

  async function step3(
    _input: (typeof acceptProcedureStep2)['_def']['_output_out'],
  ) {
    //
  }

  return promise;
}
