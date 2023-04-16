import { UserModel } from '@deeplib/db';
import { getPasswordHashValues } from '@stdlib/crypto';
import { isNanoID } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { z } from 'zod';

import { decryptUserRehashedLoginHash, derivePasswordValues } from '../crypto';

export const userRegistrationSchema = once(() =>
  z.object({
    userId: z.string().refine(isNanoID),
    groupId: z.string().refine(isNanoID),
    pageId: z.string().refine(isNanoID),

    userPublicKeyring: z.instanceof(Uint8Array),
    userEncryptedPrivateKeyring: z.instanceof(Uint8Array),
    userEncryptedSymmetricKeyring: z.instanceof(Uint8Array),

    userEncryptedName: z.instanceof(Uint8Array),
    userEncryptedDefaultNote: z.instanceof(Uint8Array),
    userEncryptedDefaultArrow: z.instanceof(Uint8Array),

    groupEncryptedAccessKeyring: z.instanceof(Uint8Array),
    groupEncryptedInternalKeyring: z.instanceof(Uint8Array),
    groupEncryptedContentKeyring: z.instanceof(Uint8Array),

    groupPublicKeyring: z.instanceof(Uint8Array),
    groupEncryptedPrivateKeyring: z.instanceof(Uint8Array),

    pageEncryptedSymmetricKeyring: z.instanceof(Uint8Array),
    pageEncryptedRelativeTitle: z.instanceof(Uint8Array),
    pageEncryptedAbsoluteTitle: z.instanceof(Uint8Array),
  }),
);
export type UserRegistrationSchema = z.output<
  ReturnType<typeof userRegistrationSchema>
>;

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
