import type { dataHashes, DataPrefix } from './data-hashes';

export function hget<
  DataPrefix_ extends DataPrefix,
  DataField_ extends Extract<
    keyof (typeof dataHashes)[DataPrefix_]['fields'],
    string
  > = Extract<keyof (typeof dataHashes)[DataPrefix_]['fields'], string>,
>(
  prefix: DataPrefix_,
  suffix: string,
  field: DataField_,
): [DataPrefix_, string, DataField_] {
  return [prefix, suffix, field];
}

export function hset<
  DataPrefix_ extends DataPrefix,
  DataField_ extends Extract<
    keyof (typeof dataHashes)[DataPrefix_]['fields'],
    string
  > = Extract<keyof (typeof dataHashes)[DataPrefix_]['fields'], string>,
>(
  prefix: DataPrefix_,
  suffix: string,
  field: DataField_,
  value: any,
): [DataPrefix_, string, DataField_, any] {
  return [prefix, suffix, field, value];
}
