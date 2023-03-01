import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { groupKeyRotationSchema } from 'src/group-key-rotation';
import { Locals } from 'src/utils';

import { MakePrivateService } from './make-private.service';

class BodyDto extends createZodDto(groupKeyRotationSchema.partial()) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class MakePrivateController {
  constructor(private readonly endpointService: MakePrivateService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = {
          agentId,
          groupId,

          ...body,

          dtrx,
        };

        if (
          !(await this.endpointService.agentHasSufficientPermissions(values))
        ) {
          throw new HttpException(
            'Insufficient permissions.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        if (!(await this.endpointService.groupIsPublic(values))) {
          throw new HttpException(
            'Group is already private.',
            HttpStatus.BAD_REQUEST,
          );
        }

        checkRedlockSignalAborted(signals);

        if (
          !(await this.endpointService.agentHasProvidedNecessaryData(values))
        ) {
          checkRedlockSignalAborted(signals);

          return await this.endpointService.getNecessaryDataForClient(values);
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.makePrivate(values);
      });
    });
  }
}
