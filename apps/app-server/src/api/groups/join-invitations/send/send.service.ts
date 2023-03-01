import { canManageRole } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './send.controller';

@Injectable()
export class SendService {
  async agentHasSufficientPermissions({
    groupId,
    agentId,
    invitationRole,
  }: EndpointValues) {
    const agentRole = await dataAbstraction().hget(
      'group-member',
      `${groupId}:${agentId}`,
      'role',
    );

    return canManageRole(agentRole!, invitationRole);
  }

  async targetCanBeInvited({ groupId, patientId }: EndpointValues) {
    const [groupJoinInvitationExists, groupMemberRole] = await Promise.all([
      dataAbstraction().hget(
        'group-join-invitation',
        `${groupId}:${patientId}`,
        'exists',
      ),

      dataAbstraction().hget('group-member', `${groupId}:${patientId}`, 'role'),
    ]);

    return !groupJoinInvitationExists && groupMemberRole == null;
  }

  async sendJoinInvitation({
    groupId,
    agentId,

    patientId,
    invitationRole,

    encryptedAccessKeyring,
    encryptedInternalKeyring,

    userEncryptedName,

    dtrx,
  }: EndpointValues) {
    const groupIsPublic = await dataAbstraction().hget(
      'group',
      groupId,
      'is-public',
    );

    await Promise.all([
      dataAbstraction().delete(
        'group-join-request',
        `${groupId}:${patientId}`,
        { dtrx },
      ),

      dataAbstraction().insert(
        'group-join-invitation',
        `${groupId}:${patientId}`,
        {
          group_id: groupId,
          user_id: patientId,

          inviter_id: agentId,

          role: invitationRole,

          encrypted_access_keyring: groupIsPublic
            ? null
            : base64ToBytes(encryptedAccessKeyring),

          encrypted_internal_keyring: base64ToBytes(encryptedInternalKeyring),

          encrypted_name: base64ToBytes(userEncryptedName),
        },
        { dtrx },
      ),
    ]);
  }
}
