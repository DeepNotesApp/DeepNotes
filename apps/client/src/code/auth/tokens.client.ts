import {
  ACCESS_TOKEN_DURATION,
  getRefreshTokenExpiration,
} from '@deeplib/misc';

import { shouldRememberSession } from '../utils.client';
import { isTokenExpiring, isTokenValid } from './tokens.universal';

export function getClientTokenExpirationDate(
  token: 'access' | 'refresh',
): Date | null {
  const tokenExpiration = parseInt(
    internals.storage.getItem(`${token}TokenExpiration`) ?? '',
  );

  if (isNaN(tokenExpiration)) {
    return null;
  }

  return new Date(tokenExpiration);
}

export function isClientTokenValid(token: 'access' | 'refresh'): boolean {
  const expirationDate = getClientTokenExpirationDate(token);

  if (expirationDate == null) {
    return false;
  }

  return isTokenValid(expirationDate);
}

export function isClientTokenExpiring(
  token: 'access' | 'refresh',
  duration: number,
): boolean {
  const expirationDate = getClientTokenExpirationDate(token);

  if (expirationDate == null) {
    return false;
  }

  return isTokenExpiring(expirationDate, duration);
}

export function areClientTokensExpiring(): boolean {
  return (
    isClientTokenExpiring('access', ACCESS_TOKEN_DURATION) ||
    isClientTokenExpiring(
      'refresh',
      getRefreshTokenExpiration(shouldRememberSession()),
    )
  );
}

export function storeClientTokenExpiration(
  token: 'access' | 'refresh',
  duration: number,
): void {
  internals.storage.setItem(
    `${token}TokenExpiration`,
    (Date.now() + duration).toString(),
  );
}

export function storeClientTokenExpirations(): void {
  storeClientTokenExpiration('access', ACCESS_TOKEN_DURATION);
  storeClientTokenExpiration(
    'refresh',
    getRefreshTokenExpiration(shouldRememberSession()),
  );
}

export function clearClientTokenExpirations(): void {
  internals.storage.removeItem('accessTokenExpiration');
  internals.storage.removeItem('refreshTokenExpiration');
}
