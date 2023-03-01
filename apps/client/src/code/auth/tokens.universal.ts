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
