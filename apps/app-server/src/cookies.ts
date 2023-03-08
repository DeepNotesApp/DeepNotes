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

export function setCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  rememberSession: boolean,
) {
  setCookie(reply, 'accessToken', accessToken, {
    expires: rememberSession
      ? new Date(Date.now() + ACCESS_TOKEN_DURATION)
      : undefined,
  });
  setCookie(reply, 'refreshToken', refreshToken, {
    expires: rememberSession
      ? new Date(Date.now() + REFRESH_TOKEN_LONG_DURATION)
      : undefined,
  });
  setCookie(reply, 'loggedIn', 'true', {
    expires: rememberSession
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
