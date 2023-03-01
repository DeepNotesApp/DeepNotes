import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './reject.controller';

@Injectable()
export class RejectService {
  async agentHasPendingInvitation({ groupId, agentId }: EndpointValues) {
    return await dataAbstraction().hget(
      'group-join-invitation',
      `${groupId}:${agentId}`,
      'exists',
    );
  }

  async rejectJoinInvitation({ groupId, agentId, dtrx }: EndpointValues) {
    await dataAbstraction().delete(
      'group-join-invitation',
      `${groupId}:${agentId}`,
      { dtrx },
    );
  }
}
