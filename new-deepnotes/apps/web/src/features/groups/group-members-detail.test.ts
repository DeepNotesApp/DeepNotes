import { describe, expect, it, vi } from "vitest";

import { fetchGroupMembersDetail } from "./group-members-detail";

describe("fetchGroupMembersDetail", () => {
  it("returns data on 200", async () => {
    const payload = {
      viewerUserId: "u1",
      viewerRole: "owner" as const,
      groupIsPublic: true,
      joinRequestsAllowed: true,
      members: [{ userId: "u1", role: "owner" as const }],
      pendingInvitations: [],
      pendingJoinRequests: [],
    };
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 200 },
        data: payload,
        error: undefined,
      }),
    };
    const out = await fetchGroupMembersDetail({
      client: client as never,
      groupId: "aaaaaaaaaaaaaaaaaaaaa",
    });
    expect(out.data).toEqual(payload);
    expect(out.error).toBeNull();
    expect(client.GET).toHaveBeenCalledWith(
      "/api/groups/{groupId}/members/detail",
      { params: { path: { groupId: "aaaaaaaaaaaaaaaaaaaaa" } } },
    );
  });

  it("returns error on failure", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 403 },
        data: undefined,
        error: { message: "Insufficient permissions." },
      }),
    };
    const out = await fetchGroupMembersDetail({
      client: client as never,
      groupId: "aaaaaaaaaaaaaaaaaaaaa",
    });
    expect(out.data).toBeNull();
    expect(out.error).toBe("Insufficient permissions.");
  });
});
