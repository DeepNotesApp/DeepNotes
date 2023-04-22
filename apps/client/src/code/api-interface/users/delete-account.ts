import { deriveUserValues } from 'src/code/crypto';

export async function deleteAccount(input: { password: string }) {
  const email = await internals.realtime.hget(
    'user',
    authStore().userId,
    'email',
  );
  const derivedValues = await deriveUserValues({
    email,
    password: input.password,
  });

  await trpcClient.users.account.delete.mutate({
    loginHash: derivedValues.loginHash,
  });
}
