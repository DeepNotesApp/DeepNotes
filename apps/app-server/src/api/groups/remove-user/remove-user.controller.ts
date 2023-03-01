import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { objEntries, objFromEntries } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { groupKeyRotationSchema } from 'src/group-key-rotation';
import { notificationsRequestSchema, notifyUsers } from 'src/notifications';
import { Locals } from 'src/utils';

import { RemoveUserService } from './remove-user.service';

class BodyDto extends createZodDto(
  z
    .object({
      rotateGroupKeys: z.boolean().optional(),
    })
    .merge(groupKeyRotationSchema.partial())
    .merge(notificationsRequestSchema.partial()),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;
  patientId: string;

  dtrx: DataTransaction;
};

@Controller(':patientId')
export class RemoveUserController {
  constructor(readonly endpointService: RemoveUserService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
    @Param('patientId') patientId: string,
    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = {
          agentId,
          groupId,
          patientId,

          ...body,

          dtrx,
        };

        if (
          !(await this.endpointService.agentHasSufficientSubscription(values))
        ) {
          throw new HttpException(
            'This action requires a Pro plan subscription.',
            HttpStatus.FORBIDDEN,
          );
        }

        if (
          !(await this.endpointService.agentHasSufficientPermissions(values))
        ) {
          throw new HttpException(
            'Insufficient permissions.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        if (await this.endpointService.isRemovingAllGroupOwners(values)) {
          throw new HttpException(
            'Group must have at least one owner.',
            HttpStatus.FORBIDDEN,
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

        await this.endpointService.removeUser(values);

        checkRedlockSignalAborted(signals);

        await notifyUsers(
          values.notifications!.map(({ recipients, encryptedContent }) => ({
            type: 'group-member-removed',

            recipients: objFromEntries(
              objEntries(recipients).map(
                ([userId, { encryptedSymmetricKey }]) => [
                  userId,
                  {
                    encryptedSymmetricKey: base64ToBytes(encryptedSymmetricKey),
                  },
                ],
              ),
            ),

            encryptedContent: base64ToBytes(encryptedContent),
          })),
        );
      });
    });
  }
}
