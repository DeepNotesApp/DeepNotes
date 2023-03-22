import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './reject.controller';

@Injectable()
export class RejectService {
  async agentHasSufficientPermissions({ agentId, groupId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'manageLowerRanks');
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

  async rejectJoinRequest({ groupId, patientId, dtrx }: EndpointValues) {
    await dataAbstraction().patch(
      'group-join-request',
      `${groupId}:${patientId}`,
      { rejected: true },
      { dtrx },
    );
  }
}
