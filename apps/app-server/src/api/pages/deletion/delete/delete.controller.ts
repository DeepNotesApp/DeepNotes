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

import { DeleteService } from './delete.service';

export type EndpointValues = {
  agentId: string;
  pageId: string;
};

@Controller()
export class DeleteController {
  constructor(private readonly endpointService: DeleteService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('pageId') pageId: string,
  ) {
    return await usingLocks([[`page-lock:${pageId}`]], async (signals) => {
      const groupId = await dataAbstraction().hget('page', pageId, 'group-id');

      checkRedlockSignalAborted(signals);

      return await usingLocks(
        [[`group-lock:${groupId}`]],
        async (signals) => {
          const values: EndpointValues = { agentId, pageId };

          if (
            !(await this.endpointService.agentHasSufficientPermissions(values))
          ) {
            throw new HttpException(
              'Insufficient permissions.',
              HttpStatus.FORBIDDEN,
            );
          }

          checkRedlockSignalAborted(signals);

          if (await this.endpointService.isMainPage(values)) {
            throw new HttpException(
              "Cannot delete a group's main page, either replace the main page first or delete the whole group.",
              HttpStatus.FORBIDDEN,
            );
          }

          checkRedlockSignalAborted(signals);

          await this.endpointService.deletePage(values);
        },
        signals,
      );
    });
  }
}
