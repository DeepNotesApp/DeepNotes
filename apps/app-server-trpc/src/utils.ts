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

export async function createGroup(input: {
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
    input.groupId,
    {
      id: input.groupId,

      encrypted_name: input.encryptedName ?? new Uint8Array(),

      main_page_id: input.mainPageId,

      encrypted_rehashed_password_hash:
        input.passwordHash != null
          ? encryptGroupRehashedPasswordHash(
              computePasswordHash(input.passwordHash),
            )
          : undefined,

      access_keyring: input.isPublic ? input.accessKeyring : undefined,
      encrypted_content_keyring: input.encryptedContentKeyring,

      user_id: input.isPersonal ? input.userId : undefined,

      public_keyring: input.publicKeyring,
      encrypted_private_keyring: input.encryptedPrivateKeyring,
    },
    { dtrx: input.dtrx },
  );

  await dataAbstraction().insert(
    'group-member',
    `${input.groupId}:${input.userId}`,
    {
      group_id: input.groupId,
      user_id: input.userId,

      role: 'owner',

      encrypted_access_keyring: input.isPublic
        ? undefined
        : input.accessKeyring,
      encrypted_internal_keyring: input.encryptedInternalKeyring,

      encrypted_name: input.encryptedUserName,
    },
    { dtrx: input.dtrx },
  );
}

export async function generateSessionValues(input: {
  sessionId: string;
  userId: string;
  deviceId?: string;
  rememberSession: boolean;
  reply: FastifyReply;
  dtrx?: DataTransaction;
}) {
  // Generate session values

  const sessionKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
  const refreshCode = nanoid();

  // Update session in database

  if (input.deviceId != null) {
    await SessionModel.query(input.dtrx?.trx).insert({
      id: input.sessionId,

      user_id: input.userId,
      device_id: input.deviceId,

      encryption_key: sessionKey,
      refresh_code: refreshCode,

      expiration_date: addDays(new Date(), 7),
    });
  } else {
    await SessionModel.query(input.dtrx?.trx)
      .findById(input.sessionId)
      .patch({
        encryption_key: sessionKey,
        refresh_code: refreshCode,

        last_refresh_date: new Date(),
        expiration_date: addDays(new Date(), 7),
      });
  }

  // Generate tokens

  const tokens = generateTokens({
    userId: input.userId,
    sessionId: input.sessionId,
    refreshCode,
    rememberSession: input.rememberSession,
  });

  // Set cookies for client

  setCookies({
    reply: input.reply,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    rememberSession: input.rememberSession,
  });

  return {
    sessionId: input.sessionId,

    sessionKey,
    refreshCode,
  };
}

export async function checkCorrectUserPassword(input: {
  userId: string;
  loginHash: Uint8Array;
}) {
  const user = await UserModel.query()
    .findById(input.userId)
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
    input.loginHash,
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
