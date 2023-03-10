import { GroupMemberModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './make-public.controller';

@Injectable()
export class MakePublicService {
  async agentHasSufficientPermissions({ agentId, groupId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async groupIsPrivate({ groupId }: EndpointValues) {
    const groupIsPublic = await dataAbstraction().hget(
      'group',
      groupId,
      'is-public',
    );

    return !groupIsPublic;
  }

  async makePublic({ groupId, accessKeyring, dtrx }: EndpointValues) {
    const groupMembers = await GroupMemberModel.query()
      .where('group_id', groupId)
      .select('user_id');

    await Promise.all([
      dataAbstraction().patch(
        'group',
        groupId,
        { access_keyring: base64ToBytes(accessKeyring) },
        { dtrx },
      ),

      ...groupMembers.map((groupMember) =>
        dataAbstraction().patch(
          'group-member',
          `${groupId}:${groupMember.user_id}`,
          { encrypted_access_keyring: null },
          { dtrx },
        ),
      ),
    ]);
  }
}
