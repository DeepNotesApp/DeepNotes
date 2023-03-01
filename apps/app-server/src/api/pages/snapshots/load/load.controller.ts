import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { LoadService } from './load.service';

export type EndpointValues = {
  agentId: string;
  pageId: string;
  snapshotId: string;
};

@Controller(':snapshotId')
export class LoadController {
  constructor(private readonly endpointService: LoadService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('pageId') pageId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return await usingLocks([[`page-lock:${pageId}`]], async (signals) => {
      const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

      checkRedlockSignalAborted(signals);

      return await usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          const values: EndpointValues = {
            agentId,
            pageId,
            snapshotId,
          };

          // Check sufficient permissions

          if (
            !(await this.endpointService.agentHasSufficientPermissions(values))
          ) {
            throw new HttpException(
              'Insufficient permissions.',
              HttpStatus.FORBIDDEN,
            );
          }

          checkRedlockSignalAborted(signals);

          // Get snapshot data

          return await this.endpointService.loadSnapshot(values);
        },
        signals,
      );
    });
  }
}
