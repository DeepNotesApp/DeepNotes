import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './cancel.controller';

@Injectable()
export class CancelService {
  async agentHasPendingRequest({ groupId, agentId }: EndpointValues) {
    return (
      (await dataAbstraction().hget(
        'group-join-request',
        `${groupId}:${agentId}`,
        'rejected',
      )) === false
    );
  }

  async cancelJoinRequest({ groupId, agentId, dtrx }: EndpointValues) {
    await dataAbstraction().delete(
      'group-join-request',
      `${groupId}:${agentId}`,
      { dtrx },
    );
  }
}
