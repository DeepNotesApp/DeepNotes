import { hashUserEmail } from '@deeplib/data';
import type { DeviceModel } from '@deeplib/db';
import { UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { allAsyncProps, w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type { Cluster } from 'ioredis';
import type { Redis } from 'ioredis';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import { authenticator } from 'otplib';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import {
  decryptRecoveryCodes,
  decryptUserAuthenticatorSecret,
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptRecoveryCodes,
  verifyRecoveryCode,
} from 'src/utils/crypto';
import { getUserDevice } from 'src/utils/devices';
import { generateSessionValues } from 'src/utils/sessions';
import { z } from 'zod';

import { sendRegistrationEmail } from '../users/account/register';

const baseProcedure = publicProcedure.input(
  z.object({
    email: z
      .string()
      .regex(w3cEmailRegex)
      .or(z.string().refine((email) => email === 'demo'))
      .transform((email) =>
        (process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
          .split(';')
          .includes(email)
          ? email
          : email.toLowerCase(),
      ),
    loginHash: z.instanceof(Uint8Array),
    rememberSession: z.boolean(),

    authenticatorToken: z.string().optional(),
    rememberDevice: z.boolean().optional(),

    recoveryCode: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
  }),
);

export const loginProcedure = once(() => baseProcedure.mutation(login));

export async function login({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.dataAbstraction.transaction(async (dtrx) => {
    // Check for excessive failed login attempts

    const failedLoginAttempts = await _checkFailedLoginAttempts({
      redis: ctx.redis,

      ip: ctx.req.ip,
      email: input.email,
    });

    if (failedLoginAttempts.excessive) {
      throw new TRPCError({
        message: `Too many failed login attempts. Try again in ${failedLoginAttempts.loginBlockTTL} minutes.`,
        code: 'TOO_MANY_REQUESTS',
      });
    }

    // Get user data

    const user = await UserModel.query()
      .where('email_hash', Buffer.from(hashUserEmail(input.email)))
      .where((builder) =>
        builder
          .where('email_verified', true)
          .orWhere('email_verification_expiration_date', '>', new Date()),
      )
      .select(
        'users.id',

        'users.email_verified',
        'users.email_verification_code',

        'users.encrypted_rehashed_login_hash',

        'users.public_keyring',
        'users.encrypted_private_keyring',
        'users.encrypted_symmetric_keyring',

        'users.two_factor_auth_enabled',
        'users.encrypted_authenticator_secret',
        'users.encrypted_recovery_codes',

        'users.personal_group_id',
      )
      .first();

    if (user == null) {
      await _incrementFailedLoginAttempts({
        redis: ctx.redis,

        ip: ctx.req.ip,
        email: input.email,
      });

      throw new TRPCError({
        message: 'Incorrect email or password.',
        code: 'UNAUTHORIZED',
      });
    }

    // Assert correct password

    const passwordHashValues = getPasswordHashValues(
      decryptUserRehashedLoginHash(user.encrypted_rehashed_login_hash),
    );

    const passwordValues = derivePasswordValues({
      password: input.loginHash,
      salt: passwordHashValues.saltBytes,
    });

    const passwordIsCorrect = sodium.memcmp(
      passwordValues.hash,
      passwordHashValues.hashBytes,
    );

    if (!passwordIsCorrect) {
      await _incrementFailedLoginAttempts({
        redis: ctx.redis,

        ip: ctx.req.ip,
        email: input.email,
      });

      throw new TRPCError({
        message: 'Incorrect email or password.',
        code: 'UNAUTHORIZED',
      });
    }

    // Check if email is verified

    if (!user.email_verified) {
      await sendRegistrationEmail({
        email: input.email,
        emailVerificationCode: user.email_verification_code,
      });

      throw new TRPCError({
        message: 'Email awaiting verification. New email sent.',
        code: 'UNAUTHORIZED',
      });
    }

    // Get user device

    const device = await getUserDevice({
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'] ?? '',
      userId: user.id,

      dtrx,
    });

    // Check two-factor authentication

    if (user.two_factor_auth_enabled) {
      await _checkTwoFactorAuth({
        device,

        email: input.email,
        ip: ctx.req.ip,

        redis: ctx.redis,

        user,

        authenticatorToken: input.authenticatorToken!,
        recoveryCode: input.recoveryCode!,
        rememberDevice: input.rememberDevice!,

        dtrx,
      });
    }

    // Generate session

    const sessionId = nanoid();

    const { sessionKey } = await generateSessionValues({
      sessionId,
      userId: user.id,
      deviceId: device.id,
      rememberSession: input.rememberSession,
      reply: ctx.res,
      dtrx,
    });

    // Return session values

    return {
      userId: user.id,
      sessionId,

      sessionKey,

      personalGroupId: user.personal_group_id,

      publicKeyring: user.public_keyring,
      encryptedPrivateKeyring: createPrivateKeyring(
        user.encrypted_private_keyring,
      ).unwrapSymmetric(passwordValues.key, {
        associatedData: {
          context: 'UserEncryptedPrivateKeyring',
          userId: user.id,
        },
      }).wrappedValue,
      encryptedSymmetricKeyring: createSymmetricKeyring(
        user.encrypted_symmetric_keyring,
      ).unwrapSymmetric(passwordValues.key, {
        associatedData: {
          context: 'UserEncryptedSymmetricKeyring',
          userId: user.id,
        },
      }).wrappedValue,
    };
  });
}

async function _checkFailedLoginAttempts(input: {
  redis: Redis | Cluster;

  ip: string;
  email: string;
}) {
  const {
    emailFailedLoginAttemptsStr,
    emailFailedLoginAttemptsTTL,
    ipFailedLoginAttemptsStr,
    ipFailedLoginAttemptsTTL,
  } = await allAsyncProps({
    emailFailedLoginAttemptsStr:
      input.email === 'demo'
        ? Promise.resolve('0')
        : input.redis.get(`email-failed-login-attempts:${input.email}`),
    emailFailedLoginAttemptsTTL:
      input.email === 'demo'
        ? Promise.resolve(0)
        : input.redis.ttl(`email-failed-login-attempts:${input.email}`),

    ipFailedLoginAttemptsStr: input.redis.get(
      `ip-failed-login-attempts:${input.ip}`,
    ),
    ipFailedLoginAttemptsTTL: input.redis.ttl(
      `ip-failed-login-attempts:${input.ip}`,
    ),
  });

  const numFailedEmailLoginAttempts =
    parseInt(emailFailedLoginAttemptsStr!) || 0;
  const numFailedIPLoginAttempts = parseInt(ipFailedLoginAttemptsStr!) || 0;

  const excessive =
    Math.max(numFailedEmailLoginAttempts, numFailedIPLoginAttempts) >= 4;

  const loginBlockTTL = Math.ceil(
    Math.max(emailFailedLoginAttemptsTTL, ipFailedLoginAttemptsTTL) / 60,
  );

  return {
    excessive,

    loginBlockTTL,
  };
}

async function _incrementFailedLoginAttempts(input: {
  redis: Redis | Cluster;

  email: string;
  ip: string;
}) {
  await Promise.all([
    input.redis.incr(`email-failed-login-attempts:${input.email}`),
    input.redis.expire(`email-failed-login-attempts:${input.email}`, 15 * 60),

    input.redis.incr(`ip-failed-login-attempts:${input.ip}`),
    input.redis.expire(`ip-failed-login-attempts:${input.ip}`, 15 * 60),
  ]);
}

async function _checkTwoFactorAuth(
  input: {
    device: DeviceModel;

    authenticatorToken: string;
    recoveryCode: string;

    rememberDevice: boolean;

    user: UserModel;

    dtrx: DataTransaction;
  } & Parameters<typeof _incrementFailedLoginAttempts>[0],
) {
  if (input.device.trusted) {
    return;
  }

  if (input.authenticatorToken != null) {
    // Check authenticator token

    if (
      authenticator.check(
        input.authenticatorToken,
        decryptUserAuthenticatorSecret(
          input.user.encrypted_authenticator_secret!,
        ),
      )
    ) {
      if (input.rememberDevice) {
        // Mark device as trusted

        await input.device.$query(input.dtrx.trx).patch({ trusted: true });
      }

      return;
    } else {
      await _incrementFailedLoginAttempts({
        redis: input.redis,

        ip: input.ip,
        email: input.email,
      });

      throw new TRPCError({
        message: 'Invalid authenticator token.',
        code: 'UNAUTHORIZED',
      });
    }
  } else if (input.recoveryCode != null) {
    // Check recovery code

    if (input.user.encrypted_recovery_codes != null) {
      const recoveryCodes = decryptRecoveryCodes(
        input.user.encrypted_recovery_codes,
      );

      for (let i = 0; i < recoveryCodes.length; i++) {
        if (verifyRecoveryCode(input.recoveryCode, recoveryCodes[i])) {
          recoveryCodes.splice(i, 1);

          await input.user.$query(input.dtrx.trx).patch({
            encrypted_recovery_codes: encryptRecoveryCodes(recoveryCodes),
          });

          return;
        }
      }
    }

    await _incrementFailedLoginAttempts({
      redis: input.redis,

      ip: input.ip,
      email: input.email,
    });

    throw new TRPCError({
      message: 'Invalid recovery code.',
      code: 'UNAUTHORIZED',
    });
  }

  throw new TRPCError({
    message: 'Requires two-factor authentication.',
    code: 'UNAUTHORIZED',
  });
}
