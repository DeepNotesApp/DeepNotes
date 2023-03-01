import { canManageRole } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './accept.controller';

@Injectable()
export class AcceptService {
  async agentHasSufficientPermissions({
    groupId,
    targetRole,
    agentId,
  }: EndpointValues) {
    const agentRole = await dataAbstraction().hget(
      'group-member',
      `${groupId}:${agentId}`,
      'role',
    );

    return canManageRole(agentRole!, targetRole);
  }

  async agentHasPendingRequest({ groupId, patientId }: EndpointValues) {
    return (
      (await dataAbstraction().hget(
        'group-join-request',
        `${groupId}:${patientId}`,
        'rejected',
      )) === false
    );
  }

  async acceptGroupRequest({
    groupId,

    patientId,
    targetRole,

    encryptedInternalKeyring,
    encryptedAccessKeyring,

    dtrx,
  }: EndpointValues) {
    const groupIsPublic = await dataAbstraction().hget(
      'group',
      groupId,
      'is-public',
    );

    const encryptedName = await dataAbstraction().hget(
      'group-join-request',
      `${groupId}:${patientId}`,
      'encrypted-name',
    );

    await Promise.all([
      dataAbstraction().delete(
        'group-join-request',
        `${groupId}:${patientId}`,
        { dtrx },
      ),

      dataAbstraction().insert('group-member', `${groupId}:${patientId}`, {
        group_id: groupId,
        user_id: patientId,

        role: targetRole,

        encrypted_access_keyring: groupIsPublic
          ? null
          : base64ToBytes(encryptedAccessKeyring),

        encrypted_internal_keyring: base64ToBytes(encryptedInternalKeyring),

        encrypted_name: encryptedName,
      }),
    ]);
  }
}
