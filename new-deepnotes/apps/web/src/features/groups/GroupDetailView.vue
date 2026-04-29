<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { readSessionCrypto } from "../auth/session-keyrings";
import { useSession } from "../auth/useSession";
import {
  canChangeRole,
  canEditGroupSettings,
  canManageRole,
  roleHasManageLowerRanks,
} from "./group-role-policy";
import { useGroupMembersDetail } from "./useGroupMembersDetail";

import type { components } from "@/api/api-types.generated";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];

const ROLE_OPTIONS: GroupMemberRole[] = [
  "owner",
  "admin",
  "moderator",
  "member",
  "viewer",
];

const route = useRoute();
const router = useRouter();
const { isAuthenticated, bootstrapped, user } = useSession();

const groupIdRef = computed(() => route.params.groupId);
const {
  loading,
  actionLoading,
  error,
  detail,
  load,
  leaveGroup,
  removeMember,
  patchMemberRole,
  cancelInvitation,
  rejectMyInvitation,
  rejectJoinRequest,
  sendJoinInvitation,
  acceptJoinRequestWithCrypto,
  setJoinRequestsAllowed,
  softDeleteGroup,
} = useGroupMembersDetail(groupIdRef);

const roleDraft = ref<Record<string, GroupMemberRole>>({});
const joinAcceptRoleDraft = ref<Record<string, GroupMemberRole>>({});
const joinRequestsDraft = ref(false);

const inviteeUserIdInput = ref("");
const inviteeDisplayNameInput = ref("");
const inviteRolePick = ref<GroupMemberRole>("member");

const clientCryptoReady = () => readSessionCrypto() != null;

const groupId = computed(() => {
  const g = groupIdRef.value;
  return Array.isArray(g) ? g[0] : g;
});

const validGroupId = computed(
  () =>
    groupId.value != null && /^[A-Za-z0-9_-]{21}$/.test(groupId.value ?? ""),
);

const isPersonal = computed(
  () =>
    user.value != null &&
    groupId.value != null &&
    user.value.personalGroupId === groupId.value,
);

watch(
  [bootstrapped, isAuthenticated, groupIdRef],
  () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({
        name: "login",
        query: { redirect: route.fullPath },
      });
      return;
    }
    if (validGroupId.value) {
      void load();
    }
  },
  { immediate: true },
);

watch(
  detail,
  (d) => {
    if (d == null) {
      roleDraft.value = {};
      joinAcceptRoleDraft.value = {};
      return;
    }
    joinRequestsDraft.value = d.joinRequestsAllowed;
    const next: Record<string, GroupMemberRole> = {};
    for (const m of d.members) {
      next[m.userId] = m.role;
    }
    roleDraft.value = next;
    const jr: Record<string, GroupMemberRole> = {};
    for (const r of d.pendingJoinRequests) {
      jr[r.userId] = joinAcceptRoleDraft.value[r.userId] ?? "member";
    }
    joinAcceptRoleDraft.value = jr;
  },
  { immediate: true },
);

function viewerCanRemove(targetUserId: string, targetRole: string): boolean {
  const d = detail.value;
  const uid = user.value?.userId;
  if (d == null || uid == null) {
    return false;
  }
  if (targetUserId === uid) {
    return false;
  }
  return canManageRole(d.viewerRole, targetRole);
}

async function applyRole(userId: string, currentRole: string) {
  const d = detail.value;
  if (d == null) {
    return;
  }
  const next = roleDraft.value[userId];
  if (next == null || next === currentRole) {
    return;
  }
  if (!canChangeRole(d.viewerRole, currentRole, next)) {
    return;
  }
  await patchMemberRole(userId, next);
}

async function onLeave() {
  if (
    !confirm(
      "Leave this group? You will lose access unless you are re-invited.",
    )
  ) {
    return;
  }
  await leaveGroup();
  if (detail.value == null && error.value == null) {
    void router.replace({ name: "groups" });
  }
}

async function onRemove(userId: string) {
  if (!confirm(`Remove member ${userId}?`)) {
    return;
  }
  await removeMember(userId);
}

async function onSendInvite() {
  const id = inviteeUserIdInput.value.trim();
  const name = inviteeDisplayNameInput.value.trim();
  if (!/^[A-Za-z0-9_-]{21}$/.test(id)) {
    return;
  }
  if (name === "") {
    return;
  }
  await sendJoinInvitation({
    inviteeUserId: id,
    invitationRole: inviteRolePick.value,
    inviteeDisplayName: name,
  });
  if (error.value == null) {
    inviteeUserIdInput.value = "";
    inviteeDisplayNameInput.value = "";
  }
}

async function onAcceptJoinRequest(requesterUserId: string) {
  const role = joinAcceptRoleDraft.value[requesterUserId] ?? "member";
  await acceptJoinRequestWithCrypto({
    requesterUserId,
    targetRole: role,
  });
}

async function onSaveJoinPolicy() {
  const d = detail.value;
  if (d == null || joinRequestsDraft.value === d.joinRequestsAllowed) {
    return;
  }
  await setJoinRequestsAllowed(joinRequestsDraft.value);
}

async function onSoftDeleteGroup() {
  if (
    !confirm(
      "Schedule this group for deletion? Members lose access after the grace period unless you restore it from an owner session.",
    )
  ) {
    return;
  }
  await softDeleteGroup();
  if (detail.value == null && error.value == null) {
    void router.replace({ name: "groups" });
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-lg font-semibold tracking-tight">Group members</h1>
        <p
          v-if="validGroupId"
          class="text-muted-foreground font-mono text-xs break-all"
        >
          {{ groupId }}
        </p>
      </div>
      <Button
        v-if="isAuthenticated && validGroupId"
        :disabled="loading"
        size="sm"
        variant="outline"
        @click="load()"
      >
        Refresh
      </Button>
    </div>

    <p
      v-if="!bootstrapped || (loading && detail == null)"
      class="text-muted-foreground text-sm"
    >
      Loading…
    </p>
    <p v-else-if="!validGroupId" class="text-destructive text-sm">
      Invalid group id.
    </p>
    <p v-else-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <template v-else-if="detail != null">
      <Alert v-if="isPersonal" class="border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTitle>Personal workspace</AlertTitle>
        <AlertDescription>
          This is your personal group. Leaving or removing yourself is not supported the same way as shared groups.
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertTitle>Invites and join requests</AlertTitle>
        <AlertDescription class="space-y-2">
          <p>
            Managers can send invites below. Accepting an invite uses
            <RouterLink
              class="text-primary underline"
              :to="{ name: 'group-invite', params: { groupId: groupId } }"
            >
              the invite landing page
            </RouterLink>
            (needed because invitees cannot open this members screen until they join).
            Request to join:
            <RouterLink
              class="text-primary underline"
              :to="{ name: 'group-join-request', params: { groupId: groupId } }"
            >
              /join
            </RouterLink>.
          </p>
          <p v-if="!clientCryptoReady()" class="text-amber-800 dark:text-amber-200">
            Encrypted actions require signing in with your password on this browser (not demo).
          </p>
        </AlertDescription>
      </Alert>

      <p class="text-muted-foreground text-xs">
        You are <span class="font-medium text-foreground">{{ detail.viewerRole }}</span>
        · {{ detail.groupIsPublic ? "Public group" : "Private group" }}
        · Join requests {{ detail.joinRequestsAllowed ? "allowed" : "disabled" }}
      </p>

      <Card
        v-if="canEditGroupSettings(detail.viewerRole) && !isPersonal"
      >
        <CardHeader>
          <CardTitle class="text-base">Group settings</CardTitle>
          <CardDescription>
            Join policy and deletion (public/private changes need crypto; use a full client for those flows if required).
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex cursor-pointer items-center gap-2 text-sm">
              <input
                v-model="joinRequestsDraft"
                type="checkbox"
                class="border-input rounded border"
                :disabled="actionLoading"
              />
              Allow join requests
            </label>
            <Button
              size="sm"
              variant="secondary"
              :disabled="
                actionLoading ||
                joinRequestsDraft === detail.joinRequestsAllowed
              "
              @click="onSaveJoinPolicy"
            >
              Save join policy
            </Button>
          </div>
          <div class="border-border border-t pt-3">
            <Button
              size="sm"
              variant="destructive"
              :disabled="actionLoading || user?.demo === true"
              @click="onSoftDeleteGroup"
            >
              Schedule group deletion…
            </Button>
            <p class="text-muted-foreground mt-2 text-xs">
              Soft-deletes the group (grace period). Demo sessions cannot delete groups.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card
        v-if="roleHasManageLowerRanks(detail.viewerRole) && !isPersonal"
      >
        <CardHeader>
          <CardTitle class="text-base">Invite member</CardTitle>
          <CardDescription>
            Pro plan required on both accounts. Enter the invitee’s user id and how they should appear.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="space-y-2">
            <Label for="inv-uid">Invitee user id (21-char nanoid)</Label>
            <Input
              id="inv-uid"
              v-model="inviteeUserIdInput"
              class="font-mono text-xs"
              :disabled="actionLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="inv-name">Their display name in this group</Label>
            <Input
              id="inv-name"
              v-model="inviteeDisplayNameInput"
              :disabled="actionLoading"
            />
          </div>
          <div class="space-y-2">
            <Label for="inv-role">Role</Label>
            <select
              id="inv-role"
              v-model="inviteRolePick"
              class="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              :disabled="actionLoading"
            >
              <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>
          <Button
            size="sm"
            :disabled="
              actionLoading ||
              !clientCryptoReady() ||
              !/^[A-Za-z0-9_-]{21}$/.test(inviteeUserIdInput.trim()) ||
              inviteeDisplayNameInput.trim() === ''
            "
            @click="onSendInvite"
          >
            Send invitation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Members</CardTitle>
          <CardDescription>{{ detail.members.length }} people</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <ul class="space-y-3 text-sm">
            <li
              v-for="m in detail.members"
              :key="m.userId"
              class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div class="font-mono text-xs break-all">{{ m.userId }}</div>
                <div class="text-muted-foreground text-xs">Role: {{ m.role }}</div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <template v-if="canManageRole(detail.viewerRole, m.role)">
                  <select
                    v-model="roleDraft[m.userId]"
                    class="border-input bg-background h-9 rounded-md border px-2 text-xs"
                  >
                    <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                      {{ r }}
                    </option>
                  </select>
                  <Button
                    v-if="
                      (roleDraft[m.userId] ?? m.role) !== m.role &&
                      canChangeRole(
                        detail.viewerRole,
                        m.role,
                        roleDraft[m.userId] ?? m.role,
                      )
                    "
                    size="sm"
                    variant="secondary"
                    :disabled="actionLoading"
                    @click="applyRole(m.userId, m.role)"
                  >
                    Apply role
                  </Button>
                </template>
                <Button
                  v-if="m.userId === user?.userId && !isPersonal"
                  size="sm"
                  variant="outline"
                  :disabled="actionLoading"
                  @click="onLeave"
                >
                  Leave
                </Button>
                <Button
                  v-else-if="viewerCanRemove(m.userId, m.role)"
                  size="sm"
                  variant="destructive"
                  :disabled="actionLoading"
                  @click="onRemove(m.userId)"
                >
                  Remove
                </Button>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card v-if="detail.pendingInvitations.length > 0">
        <CardHeader>
          <CardTitle class="text-base">Pending invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2 text-sm">
            <li
              v-for="inv in detail.pendingInvitations"
              :key="inv.userId"
              class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div class="font-mono text-xs break-all">{{ inv.userId }}</div>
                <div class="text-muted-foreground text-xs">Role: {{ inv.role }}</div>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-if="inv.userId === user?.userId"
                  size="sm"
                  variant="outline"
                  :disabled="actionLoading"
                  @click="rejectMyInvitation"
                >
                  Reject invite
                </Button>
                <Button
                  v-else-if="canManageRole(detail.viewerRole, inv.role)"
                  size="sm"
                  variant="outline"
                  :disabled="actionLoading"
                  @click="cancelInvitation(inv.userId)"
                >
                  Cancel invite
                </Button>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card v-if="detail.pendingJoinRequests.length > 0">
        <CardHeader>
          <CardTitle class="text-base">Pending join requests</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2 text-sm">
            <li
              v-for="jr in detail.pendingJoinRequests"
              :key="jr.userId"
              class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="font-mono text-xs break-all">{{ jr.userId }}</div>
              <div
                v-if="roleHasManageLowerRanks(detail.viewerRole)"
                class="flex flex-wrap items-center gap-2"
              >
                <select
                  v-model="joinAcceptRoleDraft[jr.userId]"
                  class="border-input bg-background h-9 rounded-md border px-2 text-xs"
                  :disabled="actionLoading"
                >
                  <option v-for="r in ROLE_OPTIONS" :key="r" :value="r">
                    {{ r }}
                  </option>
                </select>
                <Button
                  size="sm"
                  variant="secondary"
                  :disabled="actionLoading || !clientCryptoReady()"
                  @click="onAcceptJoinRequest(jr.userId)"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="actionLoading"
                  @click="rejectJoinRequest(jr.userId)"
                >
                  Reject
                </Button>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
