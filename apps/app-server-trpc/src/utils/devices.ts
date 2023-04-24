import { DeviceModel } from '@deeplib/db';
import type { DataTransaction } from '@stdlib/data';
import { getDeviceHash } from 'src/utils/crypto';

export async function getUserDevice(input: {
  ip: string;
  userAgent: string;
  userId: string;

  dtrx?: DataTransaction;
}) {
  const deviceHash = getDeviceHash({
    ip: input.ip,
    userAgent: input.userAgent,
    userId: input.userId,
  });

  let device = await DeviceModel.query()
    .where('user_id', input.userId)
    .where('hash', deviceHash)
    .first();

  if (device == null) {
    device = await DeviceModel.query(input.dtrx?.trx).insert({
      user_id: input.userId,
      hash: deviceHash,
    });
  }

  return device;
}
