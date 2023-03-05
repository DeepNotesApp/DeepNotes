import type { RedlockAbortSignal } from 'redlock';
import type Redlock from 'redlock';

export function usingLocks(
  redlock: Redlock,
  resources: string[][],
  routine: (signals: RedlockAbortSignal[]) => Promise<any>,
  signals: RedlockAbortSignal[] = [],
) {
  let func = routine;

  for (const nodeResources of resources) {
    const prevFunc = func;

    func = (signals) =>
      redlock.using(
        nodeResources,
        process.env.DEV ? 2 * 5000 : 5000,
        (signal) => prevFunc([...signals, signal]),
      );
  }

  return func(signals);
}

export function checkRedlockSignalAborted(signals: RedlockAbortSignal[]) {
  for (const signal of signals) {
    if (signal.aborted) {
      throw signal.error;
    }
  }
}
