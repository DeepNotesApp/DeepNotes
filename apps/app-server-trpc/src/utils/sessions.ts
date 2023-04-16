import { SessionModel } from '@deeplib/db';
import type { DataTransaction } from '@stdlib/data';
import { addDays } from '@stdlib/misc';
import type { FastifyReply } from 'fastify';
import sodium from 'libsodium-wrappers';
import { nanoid } from 'nanoid';

import { setCookies } from '../cookies';
import { generateTokens } from '../tokens';

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
