import { dataHashes } from '@deeplib/data';
import { DataAbstraction } from '@stdlib/data';
import { once } from 'lodash';

import { getRedis, getSub } from './redis';

export const dataAbstraction = once(
  () => new DataAbstraction(dataHashes, getRedis(), getSub()),
);
