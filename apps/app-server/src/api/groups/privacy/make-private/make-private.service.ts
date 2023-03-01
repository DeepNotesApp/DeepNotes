import { Injectable } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { userHasPermission } from 'src/deep-utils';
import {
  getGroupKeyRotationValues,
  groupKeyRotationSchema,
  rotateGroupKeys,
} from 'src/group-key-rotation';

import type { EndpointValues } from './make-private.controller';

@Injectable()
export class MakePrivateService {
  async agentHasSufficientPermissions({ agentId, groupId }: EndpointValues) {
    return await userHasPermission(agentId, groupId, 'editGroupSettings');
  }

  async groupIsPublic({ groupId }: EndpointValues) {
    return await dataAbstraction().hget('group', groupId, 'is-public');
  }

  async agentHasProvidedNecessaryData(values: EndpointValues) {
    return groupKeyRotationSchema.safeParse(values).success;
  }

  async getNecessaryDataForClient({ groupId, agentId }: EndpointValues) {
    return await getGroupKeyRotationValues(groupId, agentId);
  }

  async makePrivate(values: EndpointValues) {
    const { groupId, dtrx } = values;

    await dataAbstraction().patch(
      'group',
      groupId,
      { access_keyring: null },
      { dtrx },
    );

    await rotateGroupKeys({
      ...(values as Required<EndpointValues>),

      groupIsPublic: false,

      dtrx,
    });
  }
}
