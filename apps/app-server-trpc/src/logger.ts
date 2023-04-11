import { mainLogger as _mainLogger } from '@stdlib/misc';
import type { Logger } from 'unilogr';

export const mainLogger: Logger = _mainLogger().extend({
  filters: [() => !!process.env.DEV || !!process.env.STAGING],
});
