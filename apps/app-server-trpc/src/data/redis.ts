import { createRedisInstance } from '@deeplib/data';
import type { Cluster } from 'ioredis';
import { once } from 'lodash';

export const getRedis = once((): Cluster => createRedisInstance());
export const getSub = once((): Cluster => createRedisInstance());
