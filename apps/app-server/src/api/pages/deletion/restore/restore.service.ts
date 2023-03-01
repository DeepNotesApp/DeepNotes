import { Injectable } from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './restore.controller';
@Injectable()
export class RestoreService {
  async agentHasSufficientPermissions({
    pageId,
    agentId,
    signals,
  }: EndpointValues) {
    const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

    checkRedlockSignalAborted(signals);

    return await userHasPermission(agentId, groupId, 'editGroupPages');
  }

  async isPageDeleted({ pageId }: EndpointValues) {
    return await dataAbstraction().hget(
      'page',
      pageId,
      'permanent-deletion-date',
    );
  }

  async restorePage({ pageId }: EndpointValues) {
    await dataAbstraction().patch('page', pageId, {
      permanent_deletion_date: null,
    });
  }
}
