import type { DeepnotesApiClient } from "../../api/client";
import type { components } from "../../api/api-types.generated";

export type GroupMembersDetail = components["schemas"]["GroupMembersDetailResponse"];
export type GroupMemberRole = components["schemas"]["GroupMemberRole"];

function errorMessageFromResponse(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: string }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

export async function fetchGroupMembersDetail(input: {
  client: DeepnotesApiClient;
  groupId: string;
}): Promise<{ data: GroupMembersDetail | null; error: string | null }> {
  const res = await input.client.GET("/api/groups/{groupId}/members/detail", {
    params: { path: { groupId: input.groupId } },
  });
  if (res.response.status === 200 && res.data) {
    return { data: res.data, error: null };
  }
  return {
    data: null,
    error: errorMessageFromResponse(res.error, "Could not load group members."),
  };
}
