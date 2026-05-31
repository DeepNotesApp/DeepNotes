function normalizeEmail(email: string, exceptions: string): string {
  return exceptions.split(";").includes(email) ? email : email.toLowerCase();
}

/**
 * Legacy-compatible HMAC-SHA256 over normalized email (see `@deeplib/data` hashUserEmail).
 */
export async function hashUserEmail(
  email: string,
  userEmailSecret: string,
  exceptions: string,
): Promise<Uint8Array> {
  const normalized = normalizeEmail(email, exceptions);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(userEmailSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(normalized));
  return new Uint8Array(sig);
}
