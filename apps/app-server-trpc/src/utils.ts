import { GroupModel, SessionModel, UserModel } from '@deeplib/db';
import { getPasswordHashValues } from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { addDays } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type { FastifyReply } from 'fastify';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';

import { setCookies } from './cookies';
import {
  computePasswordHash,
  decryptGroupRehashedPasswordHash,
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptGroupRehashedPasswordHash,
} from './crypto';
import { dataAbstraction } from './data/data-abstraction';
import { generateTokens } from './tokens';

export async function createGroup({
  groupId,
  userId,
  isPersonal,
  encryptedName,
  mainPageId,
  passwordHash,
  isPublic,
  accessKeyring,
  encryptedInternalKeyring,
  encryptedContentKeyring,
  publicKeyring,
  encryptedPrivateKeyring,
  encryptedUserName,
  dtrx,
}: {
  groupId: string;

  encryptedName?: Uint8Array;

  mainPageId: string;

  passwordHash?: Uint8Array;

  isPublic: boolean;

  isPersonal: boolean;
  userId: string;

  accessKeyring: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
  encryptedContentKeyring: Uint8Array;

  publicKeyring: Uint8Array;
  encryptedPrivateKeyring: Uint8Array;

  encryptedUserName?: Uint8Array;

  dtrx?: DataTransaction;
}) {
  await dataAbstraction().insert(
    'group',
    groupId,
    {
      id: groupId,

      encrypted_name: encryptedName ?? new Uint8Array(),

      main_page_id: mainPageId,

      encrypted_rehashed_password_hash:
        passwordHash != null
          ? encryptGroupRehashedPasswordHash(computePasswordHash(passwordHash))
          : undefined,

      access_keyring: isPublic ? accessKeyring : undefined,
      encrypted_content_keyring: encryptedContentKeyring,

      user_id: isPersonal ? userId : undefined,

      public_keyring: publicKeyring,
      encrypted_private_keyring: encryptedPrivateKeyring,
    },
    { dtrx },
  );

  await dataAbstraction().insert(
    'group-member',
    `${groupId}:${userId}`,
    {
      group_id: groupId,
      user_id: userId,

      role: 'owner',

      encrypted_access_keyring: isPublic ? undefined : accessKeyring,
      encrypted_internal_keyring: encryptedInternalKeyring,

      encrypted_name: encryptedUserName,
    },
    { dtrx },
  );
}

export async function generateSessionValues(
  sessionId: string,
  {
    userId,
    deviceId,
    rememberSession,
    reply,
    dtrx,
  }: {
    userId: string;
    deviceId?: string;
    rememberSession: boolean;
    reply: FastifyReply;
    dtrx?: DataTransaction;
  },
) {
  // Generate session values

  const sessionKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
  const refreshCode = nanoid();

  // Update session in database

  if (deviceId != null) {
    await SessionModel.query(dtrx?.trx).insert({
      id: sessionId,

      user_id: userId,
      device_id: deviceId,

      encryption_key: sessionKey,
      refresh_code: refreshCode,

      expiration_date: addDays(new Date(), 7),
    });
  } else {
    await SessionModel.query(dtrx?.trx)
      .findById(sessionId)
      .patch({
        encryption_key: sessionKey,
        refresh_code: refreshCode,

        last_refresh_date: new Date(),
        expiration_date: addDays(new Date(), 7),
      });
  }

  // Generate tokens

  const tokens = generateTokens({
    userId,
    sessionId,
    refreshCode,
    rememberSession,
  });

  // Set cookies for client

  setCookies({
    reply,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    rememberSession,
  });

  return {
    sessionId,

    sessionKey,
    refreshCode,
  };
}

export async function checkCorrectUserPassword({
  userId,
  loginHash,
}: {
  userId: string;
  loginHash: Uint8Array;
}) {
  const user = await UserModel.query()
    .findById(userId)
    .select('encrypted_rehashed_login_hash');

  if (user?.encrypted_rehashed_login_hash == null) {
    throw new TRPCError({
      message: 'User not found.',
      code: 'NOT_FOUND',
    });
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
  );

  const passwordValues = derivePasswordValues(
    loginHash,
    passwordHashValues.saltBytes,
  );

  const passwordIsCorrect = sodium.memcmp(
    passwordValues.hash,
    passwordHashValues.hashBytes,
  );

  if (!passwordIsCorrect) {
    throw new TRPCError({
      message: 'Password is incorrect.',
      code: 'BAD_REQUEST',
    });
  }
}

export async function checkCorrectGroupPassword(input: {
  groupId: string;
  groupPasswordHash: Uint8Array;
}) {
  const group = await GroupModel.query()
    .findById(input.groupId)
    .select('encrypted_rehashed_password_hash');

  if (group == null) {
    throw new TRPCError({
      message: 'Group not found.',
      code: 'NOT_FOUND',
    });
  }

  if (group.encrypted_rehashed_password_hash == null) {
    throw new TRPCError({
      message: 'This group is not password protected.',
      code: 'BAD_REQUEST',
    });
  }

  if (
    !sodium.crypto_pwhash_str_verify(
      decryptGroupRehashedPasswordHash(group.encrypted_rehashed_password_hash),
      input.groupPasswordHash,
    )
  ) {
    throw new TRPCError({
      message: 'Group password is incorrect.',
      code: 'BAD_REQUEST',
    });
  }
}
