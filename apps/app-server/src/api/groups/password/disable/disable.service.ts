import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';

import type { EndpointValues } from './disable.controller';

@Injectable()
export class DisableService {
  async agentHasSufficientPermissions({ groupId, agentId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async isGroupPasswordProtected({ groupId }: EndpointValues) {
    return await dataAbstraction().hget(
      'group',
      groupId,
      'is-password-protected',
    );
  }

  async disablePasswordProtection({
    groupId,
    groupEncryptedContentKeyring,

    dtrx,
  }: EndpointValues) {
    await dataAbstraction().patch(
      'group',
      groupId,
      {
        encrypted_rehashed_password_hash: null,

        encrypted_content_keyring: base64ToBytes(groupEncryptedContentKeyring),
      },
      { dtrx },
    );
  }
}
