import type { Cookies } from 'quasar';

export function clearCookie(cookies: Cookies, name: string) {
  cookies.remove(name, {
    domain: process.env.DEV ? process.env.HOST_DEV : process.env.HOST_PROD,
    path: '/',
  });
}
