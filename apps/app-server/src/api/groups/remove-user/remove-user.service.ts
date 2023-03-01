import { hget } from '@deeplib/data';
import { GroupMemberModel } from '@deeplib/db';
import { canManageRole } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { bytesToBase64 } from '@stdlib/base64';
import { objFromEntries } from '@stdlib/misc';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getGroupMembers } from 'src/deep-utils';
import {
  getGroupKeyRotationValues,
  rotateGroupKeys,
} from 'src/group-key-rotation';
import type { NotificationsResponse } from 'src/notifications';
import { notificationsRequestSchema } from 'src/notifications';

import type { EndpointValues } from './remove-user.controller';

@Injectable()
export class RemoveUserService {
  async agentHasSufficientSubscription({ agentId, patientId }: EndpointValues) {
    if (agentId === patientId) {
      return true;
    }

    const userPlan = await dataAbstraction().hget('user', agentId, 'plan');

    return userPlan === 'pro';
  }

  async agentHasSufficientPermissions(values: EndpointValues) {
    const { groupId, agentId, patientId } = values;

    const [agentRole, targetRole] = await dataAbstraction().mhget([
      hget('group-member', `${groupId}:${agentId}`, 'role'),
      hget('group-member', `${groupId}:${patientId}`, 'role'),
    ]);

    if (agentId === patientId) {
      return true;
    }

    return canManageRole(agentRole, targetRole);
  }

  async isRemovingAllGroupOwners({ groupId, patientId }: EndpointValues) {
    const targetRole = await dataAbstraction().hget(
      'group-member',
      `${groupId}:${patientId}`,
      'role',
    );

    const groupOwners = (await GroupMemberModel.query()
      .where('group_members.group_id', groupId)
      .where('group_members.role', 'owner')
      .count()
      .first()) as unknown as { count: number };

    return targetRole === 'owner' && groupOwners.count <= 1;
  }

  async agentHasProvidedNecessaryData(values: EndpointValues) {
    return notificationsRequestSchema.safeParse(values).success;
  }

  async getNecessaryDataForClient({
    groupId,
    agentId,
    rotateGroupKeys,
  }: EndpointValues) {
    return {
      ...(rotateGroupKeys
        ? await getGroupKeyRotationValues(groupId, agentId)
        : {}),

      ...({
        notificationRecipients: objFromEntries(
          (await getGroupMembers(groupId)).map(({ userId, publicKeyring }) => [
            userId,
            { publicKeyring: bytesToBase64(publicKeyring) },
          ]),
        ),
      } as NotificationsResponse),
    };
  }

  async removeUser(values: EndpointValues) {
    const {
      groupId,
      patientId,

      rotateGroupKeys: _rotateGroupKeys,

      dtrx,
    } = values;

    const groupIsPublic = await dataAbstraction().hget(
      'group',
      groupId,
      'is-public',
    );

    if (_rotateGroupKeys) {
      await rotateGroupKeys({
        ...(values as Required<EndpointValues>),

        groupIsPublic,

        dtrx,
      });
    }

    await dataAbstraction().delete('group-member', `${groupId}:${patientId}`, {
      dtrx,
    });
  }
}
