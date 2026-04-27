import type { components } from "../../api/api-types.generated";

import { buildSessionDemoRequest } from "./build-demo-session";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";

export type UserRegisterRequest = components["schemas"]["UserRegisterRequest"];

/**
 * Random ciphertext-shaped fields (parity with demo) plus email and UTF-8 password
 * preimage as `loginHash` — must match `loginWithPassword` / README sign-in contract.
 */
export async function buildUserRegisterRequest(input: {
  email: string;
  password: string;
}): Promise<UserRegisterRequest> {
  const base = await buildSessionDemoRequest();
  const email = input.email.trim().toLowerCase();
  const preimage = loginPreimageFromPassword(input.password);
  return {
    ...base,
    email,
    loginHash: uint8ToBase64(preimage),
  };
}
