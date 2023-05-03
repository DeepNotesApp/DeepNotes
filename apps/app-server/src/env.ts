import { once } from '@stdlib/misc';
import dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';

Object.defineProperty(process, 'env', {
  get: once(() => {
    dotenvExpand.expand(
      dotenv.config({ path: '../../.env' }).parsed?.DEV
        ? dotenv.config({ path: '../../.env' }).parsed?.PRODEV
          ? dotenv.config({ path: '../../.env.prodev' })
          : dotenv.config({ path: '../../.env.dev' })
        : dotenv.config({ path: '../../.env.prod' }),
    );

    return process.env;
  }, process.env),
});
