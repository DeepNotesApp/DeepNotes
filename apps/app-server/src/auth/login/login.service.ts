import { hashUserEmail } from '@deeplib/data';
import { DeviceModel, SessionModel, UserModel } from '@deeplib/db';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { bytesToBase64 } from '@stdlib/base64';
import { createPrivateKeyring, createSymmetricKeyring } from '@stdlib/crypto';
import { addDays, allAsyncProps } from '@stdlib/misc';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';
import { authenticator } from 'otplib';
import { setCookies } from 'src/cookies';
import { getDeviceHash } from 'src/crypto';
import { getRedis } from 'src/data/redis';
import { generateTokens } from 'src/tokens';
import {
  decryptRecoveryCodes,
  decryptUserAuthenticatorSecret,
  encryptRecoveryCodes,
  verifyRecoveryCode,
} from 'src/utils';

import type { EndpointValues } from './login.controller';

@Injectable()
export class LoginService {
  async checkExcessiveFailedLoginAttempts(values: EndpointValues) {
    const { ip, email } = values;

    const {
      emailFailedLoginAttemptsStr,
      emailFailedLoginAttemptsTTL,
      ipFailedLoginAttemptsStr,
      ipFailedLoginAttemptsTTL,
    } = await allAsyncProps({
      emailFailedLoginAttemptsStr:
        email === 'demo'
          ? Promise.resolve('0')
          : getRedis().get(`email-failed-login-attempts:${email}`),
      emailFailedLoginAttemptsTTL:
        email === 'demo'
          ? Promise.resolve(0)
          : getRedis().ttl(`email-failed-login-attempts:${email}`),

      ipFailedLoginAttemptsStr: getRedis().get(
        `ip-failed-login-attempts:${ip}`,
      ),
      ipFailedLoginAttemptsTTL: getRedis().ttl(
        `ip-failed-login-attempts:${ip}`,
      ),
    });

    values.loginBlockTTL = Math.ceil(
      Math.max(emailFailedLoginAttemptsTTL, ipFailedLoginAttemptsTTL) / 60,
    );

    const numFailedEmailLoginAttempts =
      parseInt(emailFailedLoginAttemptsStr!) || 0;
    const numFailedIPLoginAttempts = parseInt(ipFailedLoginAttemptsStr!) || 0;

    return Math.max(numFailedEmailLoginAttempts, numFailedIPLoginAttempts) >= 4;
  }

  async incrementFailedLoginAttempts({ email, ip }: EndpointValues) {
    await Promise.all([
      getRedis().incr(`email-failed-login-attempts:${email}`),
      getRedis().expire(`email-failed-login-attempts:${email}`, 15 * 60),

      getRedis().incr(`ip-failed-login-attempts:${ip}`),
      getRedis().expire(`ip-failed-login-attempts:${ip}`, 15 * 60),
    ]);
  }

  async getUserData({ email }: EndpointValues) {
    return await UserModel.query()
      .where('email_hash', Buffer.from(hashUserEmail(email)))
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
  }

  async getDevice({ ip, userAgent, user, trx }: EndpointValues) {
    const deviceHash = getDeviceHash({ ip, userAgent, userId: user.id });

    let device = await DeviceModel.query()
      .where('user_id', user.id)
      .where('hash', deviceHash)
      .first();

    if (device == null) {
      device = await DeviceModel.query(trx).insert({
        user_id: user.id,
        hash: deviceHash,
      });
    }

    return device;
  }

  async checkTwoFactorAuth(values: EndpointValues) {
    const {
      user,
      device,
      authenticatorToken,
      rememberDevice,
      recoveryCode,
      trx,
    } = values;

    if (
      !user.two_factor_auth_enabled ||
      user.encrypted_authenticator_secret == null ||
      device.trusted
    ) {
      return;
    }

    if (authenticatorToken != null) {
      // Check authenticator token

      if (
        !authenticator.check(
          authenticatorToken,
          decryptUserAuthenticatorSecret(user.encrypted_authenticator_secret),
        )
      ) {
        await this.incrementFailedLoginAttempts(values);

        throw new HttpException(
          'Incorrect authenticator token.',
          HttpStatus.FORBIDDEN,
        );
      }

      // Mark device as trusted

      await device.$query(trx).patch({
        trusted: rememberDevice,
      });
    } else if (recoveryCode != null) {
      // Check recovery code

      if (user.encrypted_recovery_codes != null) {
        const recoveryCodes = decryptRecoveryCodes(
          user.encrypted_recovery_codes,
        );

        for (let i = 0; i < recoveryCodes.length; i++) {
          if (verifyRecoveryCode(recoveryCode, recoveryCodes[i])) {
            recoveryCodes.splice(i, 1);

            await user.$query(trx).patch({
              encrypted_recovery_codes: encryptRecoveryCodes(recoveryCodes),
            });

            return;
          }
        }
      }

      await this.incrementFailedLoginAttempts(values);

      throw new HttpException('Invalid recovery code.', HttpStatus.FORBIDDEN);
    } else {
      return { twoFactorAuth: true };
    }
  }

  async insertSessionInDb(values: EndpointValues) {
    values.sessionKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();

    values.sessionId = nanoid();
    values.refreshCode = nanoid();

    const { user, device, sessionId, sessionKey, refreshCode, trx } = values;

    await SessionModel.query(trx).insert({
      id: sessionId,
      user_id: user.id,
      device_id: device.id,
      encryption_key: sessionKey,
      refresh_code: refreshCode,
      expiration_date: addDays(new Date(), 7),
    });
  }

  async setAuthCookies({
    jwtService,
    email,
    user,
    sessionId,
    refreshCode,
    reply,
    rememberSession,
  }: EndpointValues) {
    const tokens = await generateTokens(
      jwtService,
      user.id,
      sessionId,
      refreshCode,
      rememberSession && email !== 'demo',
    );

    setCookies(reply, tokens.accessToken, tokens.refreshToken, rememberSession);
  }

  async createResponse({
    user,
    sessionKey,
    sessionId,
    passwordValues,
  }: EndpointValues) {
    return {
      publicKeyring: bytesToBase64(user.public_keyring),
      encryptedPrivateKeyring: bytesToBase64(
        createPrivateKeyring(user.encrypted_private_keyring).unwrapSymmetric(
          passwordValues!.key,
          {
            associatedData: {
              context: 'UserEncryptedPrivateKeyring',
              userId: user.id,
            },
          },
        ).fullValue,
      ),
      encryptedSymmetricKeyring: bytesToBase64(
        createSymmetricKeyring(
          user.encrypted_symmetric_keyring,
        ).unwrapSymmetric(passwordValues!.key, {
          associatedData: {
            context: 'UserEncryptedSymmetricKeyring',
            userId: user.id,
          },
        }).fullValue,
      ),

      sessionKey: bytesToBase64(sessionKey),

      personalGroupId: user.personal_group_id,

      userId: user.id,
      sessionId: sessionId,
    };
  }
}
