<template>
  <DeepBtn
    label="Change group password"
    color="primary"
    @click="changeGroupPassword()"
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

async function changeGroupPassword() {
  try {
    let groupContentKeyring = await groupContentKeyrings()(groupId).getAsync();

    if (groupContentKeyring == null) {
      throw new Error('Group keyring not found.');
    }

    // Remove old password protection from group keyring

    const currentGroupPassword = await asyncPrompt<string>({
      title: 'Change group password',
      message: 'Enter the current group password:',
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

    const currentGroupPasswordValues = await computeGroupPasswordValues(
      groupId,
      currentGroupPassword,
    );

    if (groupContentKeyring.topLayer === DataLayer.Symmetric) {
      groupContentKeyring = groupContentKeyring.unwrapSymmetric(
        currentGroupPasswordValues.passwordKey,
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

    // Reprotect group keyring with new password

    const newGroupPassword = await asyncPrompt<string>({
      title: 'Change group password',
      message: 'Enter the new group password:',
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

    const newGroupPasswordValues = await computeGroupPasswordValues(
      groupId,
      newGroupPassword,
    );

    groupContentKeyring = groupContentKeyring.wrapSymmetric(
      newGroupPasswordValues.passwordKey,
      {
        associatedData: {
          context: 'GroupContentKeyringPasswordProtection',
          groupId,
        },
      },
    ) as SymmetricKeyring;

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

    // Send password change request

    await api().post(`api/groups/${groupId}/password/change`, {
      groupCurrentPasswordHash: bytesToBase64(
        currentGroupPasswordValues.passwordHash,
      ),
      groupNewPasswordHash: bytesToBase64(newGroupPasswordValues.passwordHash),

      groupEncryptedContentKeyring: bytesToBase64(
        groupContentKeyring.fullValue,
      ),
    });

    $quasar().notify({
      message: 'Group password changed successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
