export type KeyType = string | number | symbol;

export type Replace<T, U, V> = T extends U ? V : T;

export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type TupleToUnion<T extends readonly any[]> = T[number];

export type TupleToIntersection<A extends readonly any[]> = UnionToIntersection<
  TupleToUnion<A>
>;

type OptionalPropertyNames<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type MergeProperties<L, R, K extends keyof L & keyof R> = {
  [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type MergeTwo<L, R> = Id<
  Pick<L, Exclude<keyof L, keyof R>> &
    Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
    Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
    MergeProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

export type Merge<A extends readonly [...any]> = A extends [infer L, ...infer R]
  ? MergeTwo<L, Merge<R>>
  : unknown;

export const tuple = <T extends readonly any[]>(args: [...T]): T => args;

export type AllAwaited<T extends readonly any[]> = {
  [K in keyof T]: T[K] extends PromiseLike<infer U> ? U : T[K];
};
export type SettledAwaited<T extends readonly any[]> = {
  [K in keyof T]: T[K] extends PromiseLike<infer U> ? U | undefined : T[K];
};

export type ClassType<T = any> = { new (...args: any[]): T };

export type Constructor<T extends abstract new (...args: any) => any> = new (
  ...params: ConstructorParameters<T>
) => InstanceType<T>;

export type ConstructorFunc<T extends abstract new (...args: any) => any> = (
  ...params: ConstructorParameters<T>
) => InstanceType<T>;

export type FirstElem<T extends readonly any[]> = T extends [any, ...infer R]
  ? T extends [...infer F, ...R]
    ? F
    : never
  : never;

export type NonFirstElem<T extends readonly any[]> = T extends [any, ...infer R]
  ? [...R]
  : never;

export type ExcludeFromTuple<T extends readonly any[], E> = T extends [
  infer F,
  ...infer R,
]
  ? [F] extends [E]
    ? ExcludeFromTuple<R, E>
    : [...FirstElem<T>, ...ExcludeFromTuple<R, E>]
  : [];
