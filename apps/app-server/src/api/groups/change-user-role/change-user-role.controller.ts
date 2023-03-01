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
import { isNanoID, objEntries, objFromEntries } from '@stdlib/misc';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { getGroupMembers, RoleEnum } from 'src/deep-utils';
import type { NotificationsResponse } from 'src/notifications';
import { notificationsRequestSchema, notifyUsers } from 'src/notifications';
import { Locals } from 'src/utils';

import { ChangeUserRoleService } from './change-user-role.service';

class BodyDto extends createZodDto(
  z
    .object({
      patientId: z.string().refine(isNanoID),
      requestedRole: RoleEnum(),
    })
    .merge(notificationsRequestSchema.partial()),
) {}

export type EndpointValues = BodyDto & {
  agentId: string;
  groupId: string;

  dtrx: DataTransaction;
};

@Controller()
export class ChangeUserRoleController {
  constructor(readonly endpointService: ChangeUserRoleService) {}

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

        if (await this.endpointService.isRemovingAllGroupOwners(values)) {
          throw new HttpException(
            'Group must have at least one owner.',
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

        await this.endpointService.changeUserRole(values);

        checkRedlockSignalAborted(signals);

        await notifyUsers(
          values.notifications!.map(({ recipients, encryptedContent }) => ({
            type: 'group-member-role-changed',

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
