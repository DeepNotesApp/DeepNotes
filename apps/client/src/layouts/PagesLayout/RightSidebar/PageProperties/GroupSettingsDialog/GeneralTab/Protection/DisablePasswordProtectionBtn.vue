<template>
  <DeepBtn
    label="Disable password protection"
    color="negative"
    @click="disablePasswordProtection()"
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

const groupId = inject<string>('groupId')!;

async function disablePasswordProtection() {
  try {
    // Get password protected group keyring

    let groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

    if (groupContentKeyring == null) {
      throw new Error('Group keyring not found.');
    }

    // Get group password values

    const groupPassword = await asyncPrompt<string>({
      title: 'Disable password protection',
      message: 'Enter the group password:',
      color: 'primary',
      prompt: {
        type: 'password',
        model: '',
        filled: true,
      },
      style: {
        maxWidth: '350px',
      },
      cancel: true,
    });

    const groupPasswordValues = await computeGroupPasswordValues(
      groupId,
      groupPassword,
    );

    // Remove password protection from group keyring

    if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
      groupContentKeyring = groupContentKeyring.unwrapSymmetric(
        groupPasswordValues.passwordKey,
        {
          associatedData: {
            context: 'GroupContentKeyringPasswordProtection',
            groupId,
          },
        },
      ) as SymmetricKeyring;
    } else if (groupContentKeyring.topLayer !== DataLayer.Raw) {
      throw new Error('Group is not password protected.');
    }

    // Wrap content keyring with group keyring

    const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

    if (accessKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group keyring.');
    }

    groupContentKeyring = groupContentKeyring.wrapSymmetric(accessKeyring, {
      associatedData: {
        context: 'GroupContentKeyring',
        groupId,
      },
    }) as SymmetricKeyring;

    // Send password disable request

    await api().post(`api/groups/${groupId}/password/disable`, {
      groupPasswordHash: bytesToBase64(groupPasswordValues.passwordHash),

      groupEncryptedContentKeyring: bytesToBase64(
        groupContentKeyring.fullValue,
      ),
    });

    $quasar().notify({
      message: 'Group password protection disabled successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
