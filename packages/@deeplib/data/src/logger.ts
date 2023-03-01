import { once } from 'lodash';
import {
  addInterval,
  addTimestamp,
  capitalizeField,
  colorizeField,
  ConsoleOutput,
  Logger,
  markSlot,
  writeTo,
} from 'unilogr';

export const mainLogger = once(
  () =>
    new Logger([
      capitalizeField('level'),
      colorizeField('level'),
      addTimestamp(),
      addInterval(),

      markSlot(),

      ({ timestamp, level, message, ctx, interval }) =>
        `${timestamp} [${level}]${
          ctx ? ` (${ctx})` : ''
        }: ${message} (${interval})`,

      writeTo(new ConsoleOutput()),
    ]),
);
