import { afterEach, describe, expect, it, vi } from "vitest";

import { createDeepnotesApiClient } from "./client";

describe("createDeepnotesApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials: include for cookie session auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createDeepnotesApiClient("https://api.example");
    const res = await client.GET("/api/health");

    expect(res.response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input] = fetchMock.mock.calls[0] as [Request];
    expect(input.credentials).toBe("include");
    expect(input.url).toContain("/api/health");
  });
});
