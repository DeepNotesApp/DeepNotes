import { hashUserEmail } from '@deeplib/data';
import { DeviceModel, UserModel } from '@deeplib/db';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from '@stdlib/crypto';
import type { DataTransaction } from '@stdlib/data';
import { allAsyncProps, w3cEmailRegex } from '@stdlib/misc';
import { TRPCError } from '@trpc/server';
import type { Cluster } from 'ioredis';
import sodium from 'libsodium-wrappers';
import { once } from 'lodash';
import { nanoid } from 'nanoid';
import { authenticator } from 'otplib';
import {
  decryptRecoveryCodes,
  decryptUserAuthenticatorSecret,
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptRecoveryCodes,
  getDeviceHash,
  verifyRecoveryCode,
} from 'src/crypto';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { publicProcedure } from 'src/trpc/helpers';
import { generateSessionValues } from 'src/utils/sessions';
import { z } from 'zod';

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

    // Check correct password

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
        dtrx,

        deviceId: device.id,

        email: input.email,
        ip: ctx.req.ip,

        redis: ctx.redis,

        user,

        authenticatorToken: input.authenticatorToken!,
        recoveryCode: input.recoveryCode!,
        rememberDevice: input.rememberDevice!,
      });
    }

    const sessionId = nanoid();

    const { sessionKey } = await generateSessionValues({
      sessionId,
      userId: user.id,
      deviceId: device.id,
      rememberSession: input.rememberSession,
      reply: ctx.res,
    });

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
  redis: Cluster;

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
  redis: Cluster;

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

export async function getUserDevice(input: {
  ip: string;
  userAgent: string;
  userId: string;

  dtrx?: DataTransaction;
}) {
  const deviceHash = getDeviceHash({
    ip: input.ip,
    userAgent: input.userAgent,
    userId: input.userId,
  });

  let device = await DeviceModel.query()
    .where('user_id', input.userId)
    .where('hash', deviceHash)
    .first();

  if (device == null) {
    device = await DeviceModel.query(input.dtrx?.trx).insert({
      user_id: input.userId,
      hash: deviceHash,
    });
  }

  return device;
}

async function _checkTwoFactorAuth(
  input: {
    deviceId: string;

    authenticatorToken: string;
    recoveryCode: string;

    rememberDevice: boolean;

    user: UserModel;

    dtrx: DataTransaction;
  } & Parameters<typeof _incrementFailedLoginAttempts>[0],
) {
  if (input.authenticatorToken != null) {
    // Check authenticator token

    if (
      !authenticator.check(
        input.authenticatorToken,
        decryptUserAuthenticatorSecret(
          input.user.encrypted_authenticator_secret!,
        ),
      )
    ) {
      if (input.rememberDevice) {
        // Mark device as trusted

        await DeviceModel.query(input.dtrx.trx)
          .where({ id: input.deviceId })
          .patch({ trusted: true });
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
