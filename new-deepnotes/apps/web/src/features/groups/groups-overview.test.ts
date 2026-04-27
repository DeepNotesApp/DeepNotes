import { describe, expect, it, vi } from "vitest";

import type { DeepnotesApiClient } from "../../api/client";
import { fetchGroupsOverview } from "./groups-overview";

describe("fetchGroupsOverview", () => {
  it("aggregates main page, members, and first page window per group", async () => {
    const client = {
      GET: vi
        .fn()
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { groupIds: ["g1", "g2"] },
        })
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { mainPageId: "p0" },
        })
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { userIds: ["u1"] },
        })
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { pageIds: ["p0"], hasMore: false },
        })
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { mainPageId: "px" },
        })
        .mockResolvedValueOnce({
          response: { status: 404 },
          data: undefined,
        })
        .mockResolvedValueOnce({
          response: { status: 200 },
          data: { pageIds: [], hasMore: false },
        }),
    };
    const out = await fetchGroupsOverview({
      client: client as unknown as DeepnotesApiClient,
      personalGroupId: "g1",
    });
    expect(out.error).toBeNull();
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toMatchObject({
      groupId: "g1",
      isPersonal: true,
      mainPageId: "p0",
      memberUserCount: 1,
      membersUnavailable: false,
      pageIds: ["p0"],
    });
    expect(out.rows[1]).toMatchObject({
      groupId: "g2",
      isPersonal: false,
      mainPageId: "px",
      memberUserCount: null,
      membersUnavailable: true,
    });
  });

  it("returns an error when me/groups fails", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 401 },
        error: { message: "nope" },
        data: undefined,
      }),
    };
    const out = await fetchGroupsOverview({
      client: client as unknown as DeepnotesApiClient,
      personalGroupId: null,
    });
    expect(out.rows).toEqual([]);
    expect(out.error).toBe("nope");
  });
});
