import { ref, type Ref } from "vue";

/** Route `params.groupId` may be undefined until matched. */
export type GroupIdParamRef = Ref<string | string[] | undefined>;

import { useSession } from "../auth/useSession";
import {
  fetchGroupMembersDetail,
  type GroupMembersDetail,
} from "./group-members-detail";
import { useGroupMemberActions } from "./useGroupMembersDetail-actions";
import { useGroupInvitationActions } from "./useGroupMembersDetail-invitations";
import { useGroupJoinRequestActions } from "./useGroupMembersDetail-join-requests";
import { useGroupPrivacyActions } from "./useGroupMembersDetail-privacy";
import { useGroupDeletionActions } from "./useGroupMembersDetail-deletion";
import { useGroupPasswordActions } from "./useGroupMembersDetail-password";

export function useGroupMembersDetail(groupId: GroupIdParamRef) {
  const loading: Ref<boolean> = ref(false);
  const actionLoading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const detail: Ref<GroupMembersDetail | null> = ref(null);

  const { client, isAuthenticated, user } = useSession();

  function resolvedGroupId(): string | null {
    const g = groupId.value;
    const id = Array.isArray(g) ? g[0] : g;
    return id && /^[A-Za-z0-9_-]{21}$/.test(id) ? id : null;
  }

  async function load() {
    const id = resolvedGroupId();
    if (!isAuthenticated.value || id == null) {
      detail.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const out = await fetchGroupMembersDetail({ client, groupId: id });
      detail.value = out.data;
      error.value = out.error;
    } finally {
      loading.value = false;
    }
  }

  const memberActions = useGroupMemberActions({
    client,
    resolvedGroupId,
    detail,
    actionLoading,
    error,
    load,
    user,
  });

  const invitationActions = useGroupInvitationActions({
    client,
    resolvedGroupId,
    detail,
    actionLoading,
    error,
    load,
    user,
  });

  const joinRequestActions = useGroupJoinRequestActions({
    client,
    resolvedGroupId,
    detail,
    actionLoading,
    error,
    load,
  });

  const privacyActions = useGroupPrivacyActions({
    client,
    resolvedGroupId,
    detail,
    actionLoading,
    error,
    load,
  });

  const deletionActions = useGroupDeletionActions({
    client,
    resolvedGroupId,
    detail,
    actionLoading,
    error,
  });

  const passwordActions = useGroupPasswordActions({
    client,
    resolvedGroupId,
    actionLoading,
    error,
    load,
  });

  return {
    loading,
    actionLoading,
    error,
    detail,
    load,
    ...memberActions,
    ...invitationActions,
    ...joinRequestActions,
    ...privacyActions,
    ...deletionActions,
    ...passwordActions,
  };
}
