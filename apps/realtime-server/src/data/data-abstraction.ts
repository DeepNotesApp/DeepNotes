import { dataHashes } from '@deeplib/data';
import { DataAbstraction } from '@stdlib/data';
import { once } from 'lodash';
import NodeCache from 'node-cache';

import { getRedis, getSub } from './redis';

export const dataAbstraction = once(() => {
  const nodeCache = new NodeCache();

  const dataAbstraction = new DataAbstraction(
    dataHashes,
    nodeCache,
    getRedis(),
    getSub(),
  );

  return dataAbstraction;
});
