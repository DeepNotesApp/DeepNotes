export function addSeconds(date: Date, seconds: number): Date {
  const result = new Date(date);

  result.setTime(result.getTime() + seconds * 1000);

  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return addSeconds(date, minutes * 60);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);

  result.setMonth(result.getMonth() + months);

  return result;
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);

  result.setFullYear(result.getFullYear() + years);

  return result;
}

export function relativeTimeStr(
  dateDiff?: number,
  locales: string | string[] = 'en',
  options?: Intl.RelativeTimeFormatOptions,
): string {
  if (dateDiff == null) {
    return '';
  }

  const absDateDiff = Math.abs(dateDiff);

  const rtf = new Intl.RelativeTimeFormat(locales, options);

  if (absDateDiff < 1000) {
    return 'now';
  } else if (absDateDiff < 1000 * 60) {
    return rtf.format(Math.round(dateDiff / 1000), 'second');
  } else if (absDateDiff < 1000 * 60 * 60) {
    return rtf.format(Math.round(dateDiff / (1000 * 60)), 'minute');
  } else if (absDateDiff < 1000 * 60 * 60 * 24) {
    return rtf.format(Math.round(dateDiff / (1000 * 60 * 60)), 'hour');
  } else if (absDateDiff < 1000 * 60 * 60 * 24 * 30) {
    return rtf.format(Math.round(dateDiff / (1000 * 60 * 60 * 24)), 'day');
  } else if (absDateDiff < 1000 * 60 * 60 * 24 * 30 * 12) {
    return rtf.format(
      Math.round(dateDiff / (1000 * 60 * 60 * 24 * 30)),
      'month',
    );
  } else {
    return rtf.format(
      Math.round(dateDiff / (1000 * 60 * 60 * 24 * 30 * 12)),
      'year',
    );
  }
}
