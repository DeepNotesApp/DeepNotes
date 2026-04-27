/** Parse `Cookie` header (no dependency on `hono/cookie` runtime shape). */
export function readCookieHeader(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (cookieHeader == null || cookieHeader === "") return;
  const parts = cookieHeader.split(";");
  const prefix = `${name}=`;
  for (const part of parts) {
    const t = part.trim();
    if (t.startsWith(prefix)) {
      try {
        return decodeURIComponent(t.slice(prefix.length));
      } catch {
        return t.slice(prefix.length);
      }
    }
  }
  return;
}
