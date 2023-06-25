import { Cookies } from 'quasar';

export function clearCookie(name: string, cookies?: Cookies) {
  (cookies ?? Cookies).remove(name, {
    domain: process.env.HOST,
    path: '/',
  });
}
