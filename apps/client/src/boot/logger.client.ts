import { mainLogger as _mainLogger } from '@stdlib/misc';

export const mainLogger = _mainLogger;

_mainLogger.operations.unshift(
  () => !!process.env.DEV || !!process.env.STAGING,
);
