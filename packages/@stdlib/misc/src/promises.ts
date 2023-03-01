import _ from 'lodash';

import type {
  AllAwaited,
  SettledAwaited,
  TupleToIntersection,
} from './typescript';
import { objFromEntries, objKeys, objValues } from './utils';

export async function allResultsMerged<T extends any[]>(
  imports: [...T],
): Promise<TupleToIntersection<AllAwaited<[...T]>>> {
  const results = await Promise.all(imports);

  return Object.assign({}, ...results);
}

export async function namedPromises<
  K extends string[],
  P extends PromiseLike<any>[],
>(
  keys: K,
  promises: P,
): Promise<{
  [key in K[number]]: P[number] extends PromiseLike<infer T> ? T : never;
}> {
  const results = await Promise.all(promises);

  return objFromEntries(keys.map((key, index) => [key, results[index]])) as any;
}

export async function promiseProp<
  P extends PromiseLike<any>,
  K extends keyof Awaited<P>,
>(promise: P, key: K) {
  return (await promise)[key];
}

export async function promiseProps<
  P extends PromiseLike<any>,
  K extends keyof Awaited<P>,
>(promise: P, keys: K[]) {
  return _.pick(await promise, keys);
}

export async function allAsyncProps<T extends object>(promises: {
  [K in keyof T]: PromiseLike<T[K]>;
}): Promise<{ [K in keyof T]: T[K] }> {
  return (await namedPromises(objKeys(promises), objValues(promises))) as any;
}

export function objectifyPromises<
  K extends string[],
  P extends PromiseLike<any>[],
>(keys: K, promises: P): { [key in K[number]]: P[number] } {
  return objFromEntries(
    keys.map((key, index) => [key, promises[index]]),
  ) as any;
}

export async function objectifyPromiseResults<
  K extends string[],
  P extends PromiseLike<any[]>,
>(
  keys: K,
  promise: P,
): Promise<{
  [key in K[number]]: P extends PromiseLike<infer T extends any[]>
    ? T[number]
    : never;
}> {
  const results = await promise;

  return objFromEntries(keys.map((key, index) => [key, results[index]])) as any;
}

export async function allSettledResults<T extends readonly [...any]>(
  promises: [...T],
): Promise<SettledAwaited<T>> {
  return (await Promise.allSettled(promises)).map((result) =>
    result.status === 'fulfilled' ? result.value : undefined,
  ) as any;
}

export function makeLazyPromise(
  asyncFunc: () => PromiseLike<any>,
): PromiseLike<any> {
  let promise: PromiseLike<any> | undefined;

  return {
    then: (onFulfilled, onRejected) => {
      if (promise == null) {
        promise = asyncFunc();
      }

      return promise.then(onFulfilled, onRejected);
    },
  };
}
