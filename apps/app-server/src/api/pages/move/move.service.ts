import { getAllPageUpdates, hget, userHasPermission } from '@deeplib/data';
import { PageSnapshotModel, PageUpdateModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { patchMultiple } from '@stdlib/db';
import { allAsyncProps, objEntries, objFromEntries } from '@stdlib/misc';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getRedis } from 'src/data/redis';
import { bumpRecentItem, createGroup } from 'src/deep-utils';

import type { EndpointValues } from './move.controller';
import { pageKeyRotationSchema } from './move.controller';

@Injectable()
export class MoveService {
  async agentHasSufficientSubscription({
    agentId,
    sourceGroupId,
    destGroupId,
  }: EndpointValues) {
    const userPlan = await dataAbstraction().hget('user', agentId, 'plan');

    return sourceGroupId === destGroupId || userPlan === 'pro';
  }

  async agentHasSufficientPermissions({
    sourceGroupId,
    agentId,
    destGroupId,
    createGroup,
  }: EndpointValues) {
    return (
      (await userHasPermission(
        dataAbstraction(),
        agentId,
        sourceGroupId,
        'editGroupSettings',
      )) &&
      (createGroup ||
        (await userHasPermission(
          dataAbstraction(),
          agentId,
          destGroupId,
          'editGroupPages',
        )))
    );
  }

  async agentProvidedNecessaryData(values: EndpointValues) {
    const { sourceGroupId, destGroupId } = values;

    return (
      sourceGroupId === destGroupId ||
      pageKeyRotationSchema.safeParse(values).success
    );
  }

  async isMainPageOfSourceGroup({ pageId, sourceGroupId }) {
    return (
      pageId ===
      (await dataAbstraction().hget('group', sourceGroupId, 'main-page-id'))
    );
  }

  async getNecessaryDataForClient({ pageId }: EndpointValues) {
    return await allAsyncProps({
      pageEncryptedRelativeTitle: (async () =>
        bytesToBase64(
          await dataAbstraction().hget(
            'page',
            pageId,
            'encrypted-relative-title',
          ),
        ))(),
      pageEncryptedAbsoluteTitle: (async () =>
        bytesToBase64(
          await dataAbstraction().hget(
            'page',
            pageId,
            'encrypted-absolute-title',
          ),
        ))(),

      pageEncryptedUpdates: (async () =>
        (
          await getAllPageUpdates(pageId, getRedis())
        ).map((pageUpdate) => pageUpdate[1]))(),
      pageEncryptedSnapshots: (async () =>
        objFromEntries(
          (
            await PageSnapshotModel.query()
              .where('page_id', pageId)
              .select('id', 'encrypted_symmetric_key', 'encrypted_data')
              .orderBy('id')
          ).map(({ id, encrypted_symmetric_key, encrypted_data }) => [
            id,
            {
              encryptedSymmetricKey: bytesToBase64(encrypted_symmetric_key),
              encryptedData: bytesToBase64(encrypted_data),
            },
          ]),
        ))(),
    });
  }

  async createGroup({
    agentId,
    pageId,
    destGroupId,

    groupEncryptedName,
    groupPasswordHash,
    groupIsPublic,
    accessKeyring,
    groupEncryptedInternalKeyring,
    groupEncryptedContentKeyring,
    groupPublicKeyring,
    groupEncryptedPrivateKeyring,
    groupMemberEncryptedName,

    dtrx,
  }: EndpointValues) {
    await createGroup({
      groupId: destGroupId!,
      encryptedName: groupEncryptedName!,
      mainPageId: pageId,
      passwordHash: groupPasswordHash,
      isPublic: !!groupIsPublic,
      isPersonal: false,

      userId: agentId,

      accessKeyring: accessKeyring!,
      encryptedInternalKeyring: groupEncryptedInternalKeyring!,
      encryptedContentKeyring: groupEncryptedContentKeyring!,

      publicKeyring: groupPublicKeyring!,
      encryptedPrivateKeyring: groupEncryptedPrivateKeyring!,

      encryptedUserName: groupMemberEncryptedName!,

      dtrx,
    });
  }

  async movePage({
    agentId,
    pageId,
    sourceGroupId,
    destGroupId,

    pageEncryptedSymmetricKeyring,
    pageEncryptedRelativeTitle,
    pageEncryptedAbsoluteTitle,
    pageEncryptedUpdate,
    pageEncryptedSnapshots,

    setAsMainPage,

    dtrx,
  }: EndpointValues) {
    // Set page as main page of destination group

    if (setAsMainPage) {
      const [destGroupOldMainPageId, destGroupMemberId] =
        await dataAbstraction().mhget([
          hget('group', destGroupId, 'main-page-id'),
          hget('group', destGroupId, 'user-id'),
        ]);

      const oldLastParentId = await dataAbstraction().hget(
        'user-page',
        `${agentId}:${destGroupOldMainPageId}`,
        'last-parent-id',
      );

      // Replacing main page of personal group
      // Update last parent IDs of relevant pages

      if (agentId === destGroupMemberId && pageId !== destGroupOldMainPageId) {
        await dataAbstraction().patch(
          'user-page',
          `${agentId}:${pageId}`,
          { last_parent_id: oldLastParentId },
          { dtrx },
        );

        await dataAbstraction().patch(
          'user-page',
          `${agentId}:${destGroupOldMainPageId}`,
          { last_parent_id: pageId },
          { dtrx },
        );
      }

      // Set page as main page of destination group

      await dataAbstraction().patch(
        'group',
        destGroupId!,
        { main_page_id: pageId },
        { dtrx },
      );
    }

    // Moving page to a different group, reencrypt all page data

    if (sourceGroupId !== destGroupId) {
      await dataAbstraction().patch(
        'page',
        pageId,
        {
          group_id: destGroupId,
          encrypted_symmetric_keyring: base64ToBytes(
            pageEncryptedSymmetricKeyring!,
          ),
          encrypted_relative_title: base64ToBytes(pageEncryptedRelativeTitle!),
          encrypted_absolute_title: base64ToBytes(pageEncryptedAbsoluteTitle!),
        },
        { dtrx },
      );

      await patchMultiple(
        'page_snapshots',

        ['id', 'encrypted_symmetric_key', 'encrypted_data'],
        ['char(21)', 'bytea', 'bytea'],
        objEntries(pageEncryptedSnapshots!).map(
          ([snapshotId, { encryptedSymmetricKey, encryptedData }]) => [
            snapshotId,
            base64ToBytes(encryptedSymmetricKey),
            base64ToBytes(encryptedData),
          ],
        ),

        'page_snapshots.id = values.id',
        `encrypted_symmetric_key = values.encrypted_symmetric_key,
        encrypted_data = values.encrypted_data`,
        { trx: dtrx.trx },
      );

      await PageUpdateModel.query(dtrx.trx).where('page_id', pageId).delete();
      await PageUpdateModel.query(dtrx.trx).insert({
        page_id: pageId,
        index: 0,
        encrypted_data: base64ToBytes(pageEncryptedUpdate!),
      });

      await bumpRecentItem(agentId, 'group', destGroupId, { dtrx });

      dataAbstraction().addToTransaction(dtrx, () =>
        getRedis().del(
          `page-update-index:{${pageId}}`,
          `page-update-cache:{${pageId}}`,
          `page-update-buffer:{${pageId}}`,
          `page-awareness-buffer:{${pageId}}`,
        ),
      );
    }
  }
}
