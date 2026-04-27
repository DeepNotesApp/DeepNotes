import { decodeJwt, jwtVerify, SignJWT } from "jose";

import type { AccessTokenPayload, RefreshTokenPayload } from "./tokens.js";

function accessKey(secret: string) {
  return new TextEncoder().encode(secret);
}

function refreshKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(input: {
  secret: string;
  userId: string;
  sessionId: string;
}): Promise<string> {
  return await new SignJWT({
    uid: input.userId,
    sid: input.sessionId,
  } satisfies AccessTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(accessKey(input.secret));
}

export async function signRefreshToken(input: {
  secret: string;
  sessionId: string;
  refreshCode: string;
  rememberSession: boolean;
}): Promise<string> {
  const payload = {
    sid: input.sessionId,
    rfc: input.refreshCode,
    rms: input.rememberSession,
  } satisfies RefreshTokenPayload;

  const exp = input.rememberSession ? "7d" : "60m";

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(refreshKey(input.secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey(secret), {
      algorithms: ["HS256"],
    });
    const uid = payload.uid;
    const sid = payload.sid;
    if (typeof uid !== "string" || typeof sid !== "string") return null;
    return { uid, sid };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshKey(secret), {
      algorithms: ["HS256"],
    });
    const sid = payload.sid;
    const rfc = payload.rfc;
    const rms = payload.rms;
    if (typeof sid !== "string" || typeof rfc !== "string" || typeof rms !== "boolean")
      return null;
    return { sid, rfc, rms };
  } catch {
    return null;
  }
}

export function decodeRefreshTokenUnsafe(
  token: string,
): RefreshTokenPayload | null {
  try {
    const payload = decodeJwt(token);
    const sid = payload.sid;
    const rfc = payload.rfc;
    const rms = payload.rms;
    if (typeof sid !== "string" || typeof rfc !== "string" || typeof rms !== "boolean")
      return null;
    return { sid, rfc, rms };
  } catch {
    return null;
  }
}
