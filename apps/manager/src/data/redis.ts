import { createRedisInstance } from '@deeplib/data';
import { once } from 'lodash';

export const getRedis = once(() => createRedisInstance());
export const getSub = once(() => createRedisInstance());
