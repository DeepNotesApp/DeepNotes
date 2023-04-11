import { createSigner, createVerifier } from 'fast-jwt';

export const signAccessJWT = createSigner({ key: process.env.ACCESS_SECRET });
export const signRefreshJWT = createSigner({
  key: process.env.REFRESH_SECRET,
});

export const verifyAccessJWT = createVerifier({
  key: process.env.ACCESS_SECRET,
});
export const verifyRefreshJWT = createVerifier({
  key: process.env.REFRESH_SECRET,
});
