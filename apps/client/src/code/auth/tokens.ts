import {
  ACCESS_TOKEN_DURATION,
  getRefreshTokenExpiration,
} from '@deeplib/misc';

import { shouldRememberSession } from '../utils/misc';

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

export function isTokenExpiring(
  expirationDate: Date,
  tokenDuration: number,
): boolean {
  const timeDifference = expirationDate.getTime() - new Date().getTime();
  const timeExpired = tokenDuration - timeDifference;

  return timeExpired / tokenDuration >= 0.75;
}

export function isTokenValid(expirationDate: Date): boolean {
  return new Date() < expirationDate;
}
