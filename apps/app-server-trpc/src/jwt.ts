import {
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_LONG_DURATION,
  REFRESH_TOKEN_SHORT_DURATION,
} from '@deeplib/misc';
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

export const verifyAccessJWT = createVerifier({
  key: process.env.ACCESS_SECRET,
});
export const verifyRefreshJWT = createVerifier({
  key: process.env.REFRESH_SECRET,
});
