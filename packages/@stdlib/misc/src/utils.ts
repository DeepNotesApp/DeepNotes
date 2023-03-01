import type { KeyType, Merge } from './typescript';

export function negateProp<T extends Record<any, any>>(obj: T, key: keyof T) {
  // @ts-ignore
  obj[key] = !obj[key];
}

export function isNumeric(n: any): n is number {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export function sleep(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function once<T extends Function>(func: T, initialResult?: any): T {
  let called = false;
  let result = initialResult;

  return function (this: any, ...args: any[]) {
    if (!called) {
      called = true;
      result = func.apply(this, args);
    }

    return result;
  } as unknown as T;
}

export function coalesce<T>(...args: T[]) {
  for (const arg of args) {
    if (arg != null) {
      return arg;
    }
  }
}

export function objKeys<T extends object>(obj: T): Extract<keyof T, string>[] {
  return Object.keys(obj) as any;
}
export function objValues<T extends object>(obj: T): T[keyof T][] {
  return Object.values(obj);
}
export function objEntries<V extends T[keyof T], T extends object = any>(
  obj: T,
): [Extract<keyof T, string>, V][] {
  return Object.entries(obj) as any;
}
export function objFromEntries<
  E extends [KeyType, any][],
  K extends E[number][0],
  V extends E[number][1],
>(entries: E): Record<K, V> {
  return Object.fromEntries(entries) as any;
}

export function isPromiseLike(value: any): value is PromiseLike<any> {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
  );
}

export function merge<A extends object[]>(...a: [...A]) {
  return Object.assign({}, ...a) as Merge<A>;
}

export function iif(condition: any, a: any, b?: any): any {
  return condition ? a : b;
}

export function isPrimitive(value: any) {
  return value !== Object(value);
}

export function iifunc<
  A extends (...args: any) => any,
  B extends (...args: any) => any = () => undefined,
>(condition: any, a: A, b?: B): ReturnType<A> | ReturnType<B> {
  return condition ? a() : b?.();
}
