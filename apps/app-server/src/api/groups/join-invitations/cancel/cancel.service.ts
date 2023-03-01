import { hget } from '@deeplib/data';
import { canManageRole } from '@deeplib/misc';
import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './cancel.controller';

@Injectable()
export class CancelService {
  async agentHasSufficientPermissions({
    groupId,
    agentId,
    patientId,
  }: EndpointValues) {
    const [agentRole, targetRole] = await dataAbstraction().mhget([
      hget('group-member', `${groupId}:${agentId}`, 'role'),
      hget('group-join-invitation', `${groupId}:${patientId}`, 'role'),
    ]);

    return canManageRole(agentRole, targetRole);
  }

  async targetHasPendingInvitation({ groupId, patientId }: EndpointValues) {
    return await dataAbstraction().hget(
      'group-join-invitation',
      `${groupId}:${patientId}`,
      'exists',
    );
  }

  async cancelJoinInvitation({ groupId, patientId, dtrx }: EndpointValues) {
    await dataAbstraction().delete(
      'group-join-invitation',
      `${groupId}:${patientId}`,
      { dtrx },
    );
  }
}
