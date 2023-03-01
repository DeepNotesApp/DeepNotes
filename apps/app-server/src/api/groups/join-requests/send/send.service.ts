import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';

import type { EndpointValues } from './send.controller';

@Injectable()
export class SendService {
  async agentCanSendJoinRequest({ agentId, groupId }: EndpointValues) {
    const [groupJoinRequestRejected, groupMemberRole] = await Promise.all([
      dataAbstraction().hget(
        'group-join-request',
        `${groupId}:${agentId}`,
        'rejected',
      ),

      dataAbstraction().hget('group-member', `${groupId}:${agentId}`, 'role'),
    ]);

    return !groupJoinRequestRejected && groupMemberRole == null;
  }

  async sendJoinRequest({
    groupId,

    agentId,

    encryptedUserName,
    encryptedUserNameForUser,

    dtrx,
  }: EndpointValues) {
    await dataAbstraction().insert(
      'group-join-request',
      `${groupId}:${agentId}`,
      {
        group_id: groupId,
        user_id: agentId,

        encrypted_name: base64ToBytes(encryptedUserName),
        encrypted_name_for_user: base64ToBytes(encryptedUserNameForUser),

        rejected: false,
      },
      { dtrx },
    );
  }
}
