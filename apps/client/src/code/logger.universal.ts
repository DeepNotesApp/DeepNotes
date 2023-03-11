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
      () => !!process.env.DEV || !!process.env.STAGING,

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
