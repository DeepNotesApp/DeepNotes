import type { Model, TransactionOrKnex } from 'objection';

import type { DataField } from './data-field';

export interface DataHash<T extends Model = any> {
  model: () => Promise<typeof Model>;

  get: (params: {
    suffix: string;

    columns?: string[];

    trx?: TransactionOrKnex;
  }) => Promise<T | undefined>;
  set?: (params: {
    suffix: string;

    model: T;

    trx?: TransactionOrKnex;
  }) => Promise<any>;

  fields: Record<string, DataField<T>>;
}

export type DataHashes = Record<string, DataHash>;

export function validateDataHashes<T extends Record<string, DataHash>>(
  dataHashes: T,
) {
  return dataHashes;
}

export function validateDataHash<T extends DataHash>(dataHash: T) {
  return dataHash;
}
