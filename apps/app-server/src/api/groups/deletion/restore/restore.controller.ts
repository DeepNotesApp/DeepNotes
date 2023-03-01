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

import { RestoreService } from './restore.service';

export type EndpointValues = {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;

  signals: RedlockAbortSignal[];
};

@Controller()
export class RestoreController {
  constructor(readonly endpointService: RestoreService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = {
          agentId,
          groupId,
          dtrx,
          signals,
        };

        if (
          !(await this.endpointService.agentHasSufficientPermissions(values))
        ) {
          throw new HttpException(
            'Agent does not have sufficient permissions.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.restoreGroup(values);
      });
    });
  }
}
