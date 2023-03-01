<template>
  <DeepBtn
    label="Enable password protection"
    color="primary"
    @click="enablePasswordProtection()"
  />
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import type { SymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { computeGroupPasswordValues } from 'src/code/crypto.client';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

import EnablePasswordDialog from './EnablePasswordDialog.vue';

const groupId = inject<string>('groupId')!;

async function enablePasswordProtection() {
  try {
    // Get group content keyring

    let groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

    if (groupContentKeyring == null) {
      throw new Error('Group keyring not found.');
    }

    if (groupContentKeyring.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group content keyring.');
    }

    // Password protect group keyring

    const groupPassword = await asyncPrompt<string>({
      component: EnablePasswordDialog,
    });

    const groupPasswordValues = await computeGroupPasswordValues(
      groupId,
      groupPassword,
    );

    groupContentKeyring = groupContentKeyring.wrapSymmetric(
      groupPasswordValues.passwordKey,
    ) as SymmetricKeyring;

    // Wrap content keyring with group keyring

    const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

    if (accessKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group keyring.');
    }

    groupContentKeyring = groupContentKeyring.wrapSymmetric(
      accessKeyring,
    ) as SymmetricKeyring;

    // Send password enable request

    await api().post(`api/groups/${groupId}/password/enable`, {
      groupPasswordHash: bytesToBase64(groupPasswordValues.passwordHash),

      groupEncryptedContentKeyring: bytesToBase64(
        groupContentKeyring.fullValue,
      ),
    });

    $quasar().notify({
      message: 'Group password protection enabled successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
