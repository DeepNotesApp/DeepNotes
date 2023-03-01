import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

import { DeletePermanentlyService } from './delete-permanently.service';

export type EndpointValues = {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class DeletePermanentlyController {
  constructor(private readonly endpointService: DeletePermanentlyService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = { groupId, agentId, dtrx };

        if (
          !(await this.endpointService.agentHasSufficientPermissions(values))
        ) {
          throw new HttpException(
            'Insufficient permissions.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.deleteGroupPermanently(values);
      });
    });
  }
}
