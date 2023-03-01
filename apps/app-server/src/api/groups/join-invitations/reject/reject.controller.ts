import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { objEntries, objFromEntries } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { getGroupManagers } from 'src/deep-utils';
import type { NotificationsResponse } from 'src/notifications';
import { notificationsRequestSchema, notifyUsers } from 'src/notifications';
import { Locals } from 'src/utils';

import { RejectService } from './reject.service';

class BodyDto extends createZodDto(notificationsRequestSchema.partial()) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class RejectController {
  constructor(private readonly endpointService: RejectService) {}

  @Post()
  async handle(
    @Locals('userId') agentId: string,
    @Param('groupId') groupId: string,
    @Body() body: BodyDto,
  ) {
    return await usingLocks([[`group-lock:${groupId}`]], async (signals) => {
      return await dataAbstraction().transaction(async (dtrx) => {
        const values: EndpointValues = { agentId, groupId, ...body, dtrx };

        if (!(await this.endpointService.agentHasPendingInvitation(values))) {
          throw new HttpException(
            'No pending invitation.',
            HttpStatus.FORBIDDEN,
          );
        }

        checkRedlockSignalAborted(signals);

        if (!notificationsRequestSchema.safeParse(body).success) {
          return {
            notificationRecipients: objFromEntries(
              (await getGroupManagers(groupId)).map(
                ({ userId, publicKeyring }) => [
                  userId,
                  { publicKeyring: bytesToBase64(publicKeyring) },
                ],
              ),
            ),
          } as NotificationsResponse;
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.rejectJoinInvitation(values);

        checkRedlockSignalAborted(signals);

        await notifyUsers(
          values.notifications!.map(({ recipients, encryptedContent }) => ({
            type: 'group-invitation-rejected',

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
