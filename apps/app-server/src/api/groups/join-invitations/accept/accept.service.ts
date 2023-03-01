import type { GroupMemberModel } from '@deeplib/db';
import { GroupJoinInvitationModel } from '@deeplib/db';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './accept.controller';

@Injectable()
export class AcceptService {
  async agentHasPendingInvitation({ groupId, agentId }: EndpointValues) {
    return await dataAbstraction().hget(
      'group-join-invitation',
      `${groupId}:${agentId}`,
      'exists',
    );
  }

  async acceptJoinInvitation({
    groupId,
    agentId,
    userEncryptedName,

    dtrx,
  }: EndpointValues) {
    const groupJoinInvitation = await GroupJoinInvitationModel.query().findById(
      [groupId, agentId],
    );

    if (groupJoinInvitation == null) {
      throw new HttpException(
        'Group join invitation not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    await Promise.all([
      dataAbstraction().delete(
        'group-join-invitation',
        `${groupId}:${agentId}`,
        { dtrx },
      ),

      dataAbstraction().insert(
        'group-member',
        `${groupId}:${agentId}`,
        {
          ...groupJoinInvitation,

          inviter_id: undefined,

          creation_date: undefined,

          encrypted_name: base64ToBytes(userEncryptedName),
        } as unknown as Partial<GroupMemberModel>,
        { dtrx },
      ),
    ]);
  }
}
