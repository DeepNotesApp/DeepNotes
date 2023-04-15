import {
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_LONG_DURATION,
} from '@deeplib/misc';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply } from 'fastify';

export function setCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  options?: CookieSerializeOptions,
) {
  void reply.setCookie(name, value, {
    secure: !process.env.DEV,
    domain: process.env.HOST,
    path: '/',
    sameSite: 'strict',
    httpOnly: true,

    ...options,
  });
}
export function clearCookie(
  reply: FastifyReply,
  name: string,
  options?: CookieSerializeOptions,
) {
  void reply.clearCookie(name, {
    secure: !process.env.DEV,
    domain: process.env.HOST,
    path: '/',
    sameSite: 'strict',
    httpOnly: true,

    ...options,
  });
}

export function setCookies(input: {
  reply: FastifyReply;
  accessToken: string;
  refreshToken: string;
  rememberSession: boolean;
}) {
  setCookie(input.reply, 'accessToken', input.accessToken, {
    expires: input.rememberSession
      ? new Date(Date.now() + ACCESS_TOKEN_DURATION)
      : undefined,
  });
  setCookie(input.reply, 'refreshToken', input.refreshToken, {
    expires: input.rememberSession
      ? new Date(Date.now() + REFRESH_TOKEN_LONG_DURATION)
      : undefined,
  });
  setCookie(input.reply, 'loggedIn', 'true', {
    expires: input.rememberSession
      ? new Date(Date.now() + REFRESH_TOKEN_LONG_DURATION)
      : undefined,
    httpOnly: false,
  });
}
export function clearCookies(reply: FastifyReply) {
  clearCookie(reply, 'accessToken');
  clearCookie(reply, 'refreshToken');
  clearCookie(reply, 'loggedIn', { httpOnly: false });
}
