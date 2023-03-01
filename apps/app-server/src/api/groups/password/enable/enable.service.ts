import { Injectable } from '@nestjs/common';
import { base64ToBytes } from '@stdlib/base64';
import { computePasswordHash } from 'src/crypto';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';
import { encryptGroupRehashedPasswordHash } from 'src/utils';

import type { EndpointValues } from './enable.controller';

@Injectable()
export class EnableService {
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

  async enablePasswordProtection({
    groupId,
    groupPasswordHash,
    groupEncryptedContentKeyring,

    dtrx,
  }: EndpointValues) {
    await dataAbstraction().patch(
      'group',
      groupId,
      {
        encrypted_rehashed_password_hash: encryptGroupRehashedPasswordHash(
          computePasswordHash(base64ToBytes(groupPasswordHash)),
        ),

        encrypted_content_keyring: base64ToBytes(groupEncryptedContentKeyring),
      },
      { dtrx },
    );
  }
}
