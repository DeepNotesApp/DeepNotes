import { hget } from '@deeplib/data';
import { GroupMemberModel } from '@deeplib/db';
import { canChangeRole } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './change-user-role.controller';

@Injectable()
export class ChangeUserRoleService {
  async agentHasSufficientPermissions(values: EndpointValues) {
    const { groupId, agentId, requestedRole, patientId } = values;

    const [agentRole, patientRole] = await dataAbstraction().mhget([
      hget('group-member', `${groupId}:${agentId}`, 'role'),
      hget('group-member', `${groupId}:${patientId}`, 'role'),
    ]);

    return canChangeRole(agentRole, patientRole, requestedRole);
  }

  async isRemovingAllGroupOwners({
    groupId,
    requestedRole,
    patientId,
  }: EndpointValues) {
    const patientRole = await dataAbstraction().hget(
      'group-member',
      `${groupId}:${patientId}`,
      'role',
    );

    const groupOwners = (await GroupMemberModel.query()
      .where('group_members.group_id', groupId)
      .where('group_members.role', 'owner')
      .count()
      .first()) as unknown as { count: number };

    return (
      patientRole === 'owner' &&
      requestedRole !== 'owner' &&
      groupOwners.count <= 1
    );
  }

  async changeUserRole({
    groupId,
    patientId,
    requestedRole,
    dtrx,
  }: EndpointValues) {
    await dataAbstraction().patch(
      'group-member',
      `${groupId}:${patientId}`,
      {
        role: requestedRole,
      },
      { dtrx },
    );
  }
}
