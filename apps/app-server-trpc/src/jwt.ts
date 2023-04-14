import {
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_LONG_DURATION,
  REFRESH_TOKEN_SHORT_DURATION,
} from '@deeplib/misc';
import { createDecoder } from 'fast-jwt';
import { createSigner, createVerifier } from 'fast-jwt';

export const signAccessJWT = createSigner({
  key: process.env.ACCESS_SECRET,
  expiresIn: ACCESS_TOKEN_DURATION,
});
export const signShortRefreshJWT = createSigner({
  key: process.env.REFRESH_SECRET,
  expiresIn: REFRESH_TOKEN_SHORT_DURATION,
});
export const signLongRefreshJWT = createSigner({
  key: process.env.REFRESH_SECRET,
  expiresIn: REFRESH_TOKEN_LONG_DURATION,
});

const _verifyAccessJWT = createVerifier({
  key: process.env.ACCESS_SECRET,
});
export function verifyAccessJWT<TokenType>(
  token: string | Buffer,
): TokenType | null {
  try {
    return _verifyAccessJWT(token);
  } catch (error) {
    return null;
  }
}
const _verifyRefreshJWT = createVerifier({
  key: process.env.REFRESH_SECRET,
});
export function verifyRefreshJWT<TokenType>(
  token: string | Buffer,
): TokenType | null {
  try {
    return _verifyRefreshJWT(token);
  } catch (error) {
    return null;
  }
}

const _decodeAccessJWT = createDecoder();
export function decodeAccessJWT<TokenType>(
  token: string | Buffer,
): TokenType | null {
  try {
    return _decodeAccessJWT(token);
  } catch (error) {
    return null;
  }
}
const _decodeRefreshJWT = createDecoder();
export function decodeRefreshJWT<TokenType>(
  token: string | Buffer,
): TokenType | null {
  try {
    return _decodeRefreshJWT(token);
  } catch (error) {
    return null;
  }
}
