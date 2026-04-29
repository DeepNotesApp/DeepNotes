<script setup lang="ts">
import { onMounted, watch } from "vue";
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
import { useGroupPages } from "../pages/useGroupPages";

const { user, loading, bootstrapped, isAuthenticated } = useSession();
const {
  groupsWithPages,
  load: loadPages,
  loading: pagesLoading,
  error: pagesError,
} = useGroupPages();

onMounted(() => {
  if (isAuthenticated.value) {
    void loadPages();
  }
});

watch(isAuthenticated, (ok) => {
  if (ok) {
    void loadPages();
  }
});
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
        <CardDescription>Account summary and your page ids.</CardDescription>
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
          <h2 class="text-sm font-semibold">Pages</h2>
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
