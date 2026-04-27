import { isDev } from "./env.js";
import type { SessionEnv } from "./env.js";
import {
  ACCESS_TOKEN_DURATION_MS,
  REFRESH_TOKEN_LONG_DURATION_MS,
} from "./tokens.js";

export type CookieBuildOptions = {
  secure: boolean;
  domain?: string;
};

export function cookieOptionsFromEnv(env: SessionEnv): CookieBuildOptions {
  return {
    secure: !isDev(env),
    domain: env.COOKIE_DOMAIN || undefined,
  };
}

function appendPart(
  line: string,
  condition: boolean,
  part: string,
): string {
  return condition ? `${line}; ${part}` : line;
}

function serializeCookie(
  name: string,
  value: string,
  opts: CookieBuildOptions & {
    httpOnly: boolean;
    expires?: Date;
    maxAgeSec?: number;
  },
): string {
  let line = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict`;
  line = appendPart(line, !!opts.domain, `Domain=${opts.domain}`);
  line = appendPart(line, opts.secure, "Secure");
  line = appendPart(line, opts.httpOnly, "HttpOnly");
  if (opts.expires) {
    line = appendPart(line, true, `Expires=${opts.expires.toUTCString()}`);
  }
  if (opts.maxAgeSec != null) {
    line = appendPart(line, true, `Max-Age=${String(opts.maxAgeSec)}`);
  }
  return line;
}

export function buildSessionCookies(input: {
  opts: CookieBuildOptions;
  accessToken: string;
  refreshToken: string;
  rememberSession: boolean;
}): string[] {
  const rememberExpires = input.rememberSession
    ? new Date(Date.now() + REFRESH_TOKEN_LONG_DURATION_MS)
    : undefined;
  const accessExpires = input.rememberSession
    ? new Date(Date.now() + ACCESS_TOKEN_DURATION_MS)
    : undefined;

  return [
    serializeCookie("accessToken", input.accessToken, {
      ...input.opts,
      httpOnly: true,
      expires: accessExpires,
    }),
    serializeCookie("refreshToken", input.refreshToken, {
      ...input.opts,
      httpOnly: true,
      expires: rememberExpires,
    }),
    serializeCookie("loggedIn", "true", {
      ...input.opts,
      httpOnly: false,
      expires: rememberExpires,
    }),
  ];
}

export function buildClearSessionCookies(opts: CookieBuildOptions): string[] {
  const cleared = { ...opts, maxAgeSec: 0 };
  return [
    serializeCookie("accessToken", "", { ...cleared, httpOnly: true }),
    serializeCookie("refreshToken", "", { ...cleared, httpOnly: true }),
    serializeCookie("loggedIn", "", { ...cleared, httpOnly: false }),
  ];
}
