<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useSession } from "../auth/useSession";
import { buildEncryptedUserDefaultTemplatesB64 } from "../pages/encrypt-user-default-templates";
import { useGroupPages } from "../pages/useGroupPages";
import { useUserPageLists } from "../pages/useUserPageLists";

const { user, loading, bootstrapped, isAuthenticated, client } = useSession();
const {
  groupsWithPages,
  load: loadPages,
  loading: pagesLoading,
  error: pagesError,
} = useGroupPages();

const {
  loading: listsLoading,
  error: listsError,
  startingPageId,
  recentPageIds,
  favoritePageIds,
  load: loadPageLists,
  removeFromRecent,
  clearRecent,
  removeFavorites,
  clearFavorites,
} = useUserPageLists();
const defaultsLoading = ref(false);
const defaultsMessage = ref<string | null>(null);

onMounted(() => {
  if (isAuthenticated.value) {
    void loadPages();
    void loadPageLists();
  }
});

watch(isAuthenticated, (ok) => {
  if (ok) {
    void loadPages();
    void loadPageLists();
  } else {
    defaultsMessage.value = null;
  }
});

async function applyBuiltInDefaults() {
  defaultsMessage.value = null;
  if (user.value?.demo === true) {
    defaultsMessage.value = "Sign in with a password account to update encrypted defaults.";
    return;
  }
  defaultsLoading.value = true;
  try {
    const enc = await buildEncryptedUserDefaultTemplatesB64();
    if (enc == null) {
      defaultsMessage.value =
        "Unlock session crypto (sign out and sign in with your password on this device).";
      return;
    }
    const noteRes = await client.PATCH("/api/users/me/defaults/note", {
      body: { userEncryptedDefaultNote: enc.userEncryptedDefaultNote },
    });
    if (noteRes.response.status !== 204) {
      defaultsMessage.value =
        noteRes.error &&
        typeof noteRes.error === "object" &&
        "message" in noteRes.error
          ? String((noteRes.error as { message?: string }).message)
          : "Could not update default note template.";
      return;
    }
    const arrowRes = await client.PATCH("/api/users/me/defaults/arrow", {
      body: { userEncryptedDefaultArrow: enc.userEncryptedDefaultArrow },
    });
    if (arrowRes.response.status !== 204) {
      defaultsMessage.value =
        arrowRes.error &&
        typeof arrowRes.error === "object" &&
        "message" in arrowRes.error
          ? String((arrowRes.error as { message?: string }).message)
          : "Could not update default arrow template.";
      return;
    }
    defaultsMessage.value = "Default note and arrow templates updated.";
  } finally {
    defaultsLoading.value = false;
  }
}

</script>

<template>
  <div class="space-y-4">
    <p
      v-if="!bootstrapped || loading"
      class="text-muted-foreground text-sm"
    >
      Loading session…
    </p>
    <Card v-else-if="isAuthenticated && user">
      <CardHeader>
        <CardTitle>Signed in</CardTitle>
        <CardDescription>Account summary, recents, favorites, and pages.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <dl
          class="text-sm [&_dd]:text-foreground grid gap-1.5 [&_dd]:mt-0.5 [&_dd]:font-mono [&_dd]:break-all [&_dd]:text-xs [&_dt]:text-xs [&_dt]:font-medium [&_dt]:text-muted-foreground"
        >
          <div>
            <dt>User</dt>
            <dd>{{ user.userId }}</dd>
          </div>
          <div>
            <dt>Email verified</dt>
            <dd>{{ user.emailVerified ? "yes" : "no" }}</dd>
          </div>
          <div>
            <dt>Demo</dt>
            <dd>{{ user.demo ? "yes" : "no" }}</dd>
          </div>
          <div>
            <dt>Personal group</dt>
            <dd>{{ user.personalGroupId }}</dd>
          </div>
        </dl>

        <div class="border-border space-y-3 border-t pt-3">
          <h2 class="text-sm font-semibold">Starting page</h2>
          <p v-if="listsLoading && startingPageId == null" class="text-muted-foreground text-xs">
            Loading…
          </p>
          <p v-else-if="listsError" class="text-destructive text-sm">
            {{ listsError }}
          </p>
          <template v-else-if="startingPageId">
            <Button as-child size="sm" variant="outline">
              <RouterLink :to="`/pages/${startingPageId}`">
                Open {{ startingPageId }}
              </RouterLink>
            </Button>
          </template>
          <p v-else class="text-muted-foreground text-xs">No starting page loaded.</p>
        </div>

        <div class="border-border space-y-3 border-t pt-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Recent pages</h2>
            <Button
              v-if="recentPageIds.length > 0"
              size="sm"
              variant="ghost"
              :disabled="listsLoading"
              @click="clearRecent()"
            >
              Clear all
            </Button>
          </div>
          <p v-if="listsLoading && recentPageIds.length === 0" class="text-muted-foreground text-xs">
            Loading…
          </p>
          <ul v-else-if="recentPageIds.length > 0" class="flex flex-wrap gap-2">
            <li
              v-for="pid in recentPageIds"
              :key="pid"
              class="flex items-center gap-1"
            >
              <Button as-child size="sm" variant="outline">
                <RouterLink :to="`/pages/${pid}`">{{ pid }}</RouterLink>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8 shrink-0"
                title="Remove from recent"
                :disabled="listsLoading"
                @click="removeFromRecent([pid])"
              >
                ×
              </Button>
            </li>
          </ul>
          <p v-else class="text-muted-foreground text-xs">No recent pages.</p>
        </div>

        <div class="border-border space-y-3 border-t pt-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Favorites</h2>
            <Button
              v-if="favoritePageIds.length > 0"
              size="sm"
              variant="ghost"
              :disabled="listsLoading"
              @click="clearFavorites()"
            >
              Clear all
            </Button>
          </div>
          <ul v-if="favoritePageIds.length > 0" class="flex flex-wrap gap-2">
            <li
              v-for="pid in favoritePageIds"
              :key="pid"
              class="flex items-center gap-1"
            >
              <Button as-child size="sm" variant="secondary">
                <RouterLink :to="`/pages/${pid}`">{{ pid }}</RouterLink>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8 shrink-0"
                title="Remove favorite"
                :disabled="listsLoading"
                @click="removeFavorites([pid])"
              >
                ×
              </Button>
            </li>
          </ul>
          <p v-else class="text-muted-foreground text-xs">No favorite pages.</p>
        </div>

        <div class="border-border space-y-3 border-t pt-3">
          <h2 class="text-sm font-semibold">Spatial defaults</h2>
          <p class="text-muted-foreground text-xs">
            Re-save the built-in empty note and arrow templates encrypted with your account keys
            (parity with legacy default note/arrow prefs).
          </p>
          <Button
            size="sm"
            variant="secondary"
            :disabled="defaultsLoading || user.demo === true"
            @click="applyBuiltInDefaults()"
          >
            {{ defaultsLoading ? "Saving…" : "Restore built-in defaults" }}
          </Button>
          <p v-if="user.demo" class="text-muted-foreground text-xs">
            Demo sessions cannot change encrypted defaults.
          </p>
          <p v-if="defaultsMessage" class="text-sm" :class="defaultsMessage.startsWith('Default ') ? 'text-muted-foreground' : 'text-amber-800 dark:text-amber-200'">
            {{ defaultsMessage }}
          </p>
        </div>

        <div class="border-border space-y-3 border-t pt-3">
          <h2 class="text-sm font-semibold">Pages by group</h2>
          <p v-if="pagesLoading" class="text-muted-foreground text-xs">
            Loading pages…
          </p>
          <p v-else-if="pagesError" class="text-destructive text-sm">
            {{ pagesError }}
          </p>
          <ul
            v-else-if="groupsWithPages.length > 0"
            class="space-y-3 text-sm"
          >
            <li v-for="g in groupsWithPages" :key="g.groupId">
              <p class="text-muted-foreground font-mono text-xs">
                Group {{ g.groupId }}
                <span v-if="g.hasMore">· more than 20 pages (first window)</span>
              </p>
              <ul class="mt-1 flex flex-wrap gap-2">
                <li v-for="pid in g.pageIds" :key="pid">
                  <Button as-child size="sm" variant="outline">
                    <RouterLink :to="`/pages/${pid}`">{{ pid }}</RouterLink>
                  </Button>
                </li>
              </ul>
            </li>
          </ul>
          <p v-else class="text-muted-foreground text-xs">No pages listed.</p>
        </div>
      </CardContent>
    </Card>
    <Card v-else>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Sign in to continue. The API sets httpOnly cookies; the
          <code class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
            >loggedIn</code
          >
          hint cookie drives this UI.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button as-child>
          <RouterLink to="/login">Sign in</RouterLink>
        </Button>
        <Button as-child variant="secondary">
          <RouterLink to="/register">Create account</RouterLink>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
