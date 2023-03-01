import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { bytesToBase64, isBase64 } from '@stdlib/base64';
import { base64ToBytes } from '@stdlib/base64';
import type { DataTransaction } from '@stdlib/data';
import { objEntries, objFromEntries } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { getGroupMembers } from 'src/deep-utils';
import type { NotificationsResponse } from 'src/notifications';
import { notificationsRequestSchema, notifyUsers } from 'src/notifications';
import { Locals } from 'src/utils';

import { AcceptService } from './accept.service';

class BodyDto extends createZodDto(
  z
    .object({
      userEncryptedName: z.string().refine(isBase64),
    })
    .merge(notificationsRequestSchema.partial()),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class AcceptController {
  constructor(private readonly endpointService: AcceptService) {}

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
              (await getGroupMembers(groupId)).map(
                ({ userId, publicKeyring }) => [
                  userId,
                  { publicKeyring: bytesToBase64(publicKeyring) },
                ],
              ),
            ),
          } as NotificationsResponse;
        }

        checkRedlockSignalAborted(signals);

        await this.endpointService.acceptJoinInvitation(values);

        checkRedlockSignalAborted(signals);

        await notifyUsers(
          values.notifications!.map(({ recipients, encryptedContent }) => ({
            type: 'group-invitation-accepted',

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
