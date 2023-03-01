import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import type { RedlockAbortSignal } from 'redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { DeleteService } from './delete.service';

export type EndpointValues = {
  groupId: string;
  agentId: string;
  pageId: string;
  snapshotId: string;

  signals: RedlockAbortSignal[];

  dtrx: DataTransaction;
};

@Controller(':snapshotId')
export class DeleteController {
  constructor(private readonly endpointService: DeleteService) {}

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
          return await dataAbstraction().transaction(async (dtrx) => {
            const values: EndpointValues = {
              groupId: groupId!,
              agentId,
              pageId,
              snapshotId,

              signals,

              dtrx,
            };

            // Check sufficient permissions

            if (
              !(await this.endpointService.agentHasSufficientPermissions(
                values,
              ))
            ) {
              throw new HttpException(
                'Insufficient permissions.',
                HttpStatus.FORBIDDEN,
              );
            }

            checkRedlockSignalAborted(signals);

            await this.endpointService.deleteSnapshot(values);
          });
        },
        signals,
      );
    });
  }
}
