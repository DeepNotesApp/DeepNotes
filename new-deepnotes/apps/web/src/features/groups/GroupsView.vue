<script setup lang="ts">
import { watch } from "vue";
import { RouterLink, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useSession } from "../auth/useSession";
import { useGroupsOverview } from "./useGroupsOverview";

const router = useRouter();
const { isAuthenticated, bootstrapped } = useSession();
const { rows, load, loading, error } = useGroupsOverview();

watch(
  [bootstrapped, isAuthenticated],
  () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({ name: "login", query: { redirect: "/groups" } });
      return;
    }
    void load();
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-lg font-semibold tracking-tight">Groups</h1>
      <Button
        v-if="isAuthenticated"
        :disabled="loading"
        size="sm"
        variant="outline"
        @click="load()"
      >
        Refresh
      </Button>
    </div>

    <p
      v-if="!bootstrapped || (loading && rows.length === 0)"
      class="text-muted-foreground text-sm"
    >
      Loading…
    </p>
    <p v-else-if="error" class="text-destructive text-sm">
      {{ error }}
    </p>
    <ul
      v-else-if="rows.length > 0"
      class="space-y-4"
    >
      <li v-for="g in rows" :key="g.groupId">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              <span v-if="g.isPersonal">Personal</span>
              <span v-else>Shared group</span>
            </CardTitle>
            <CardDescription class="font-mono text-xs break-all">
              {{ g.groupId }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <dl
              class="grid gap-1.5 text-xs [&_dd]:text-foreground [&_dd]:mt-0.5 [&_dd]:font-mono [&_dd]:text-xs [&_dt]:text-muted-foreground"
            >
              <div
                v-if="g.mainPageId"
                class="grid gap-0.5"
              >
                <dt>Main page</dt>
                <dd>
                  <Button as-child size="sm" variant="link" class="h-auto p-0">
                    <RouterLink :to="`/page/${g.mainPageId}`">
                      {{ g.mainPageId }}
                    </RouterLink>
                  </Button>
                </dd>
              </div>
              <div
                v-else
                class="text-muted-foreground"
              >
                Main page: unavailable
              </div>
              <div>
                <dt class="text-muted-foreground">People (ids)</dt>
                <dd>
                  <span v-if="g.memberUserCount != null">{{
                    g.memberUserCount
                  }}</span>
                  <span
                    v-else-if="g.membersUnavailable"
                    class="text-muted-foreground"
                  >not listed</span>
                  <span v-else class="text-muted-foreground">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Pages (first window)</dt>
                <dd>
                  {{ g.pageIds.length
                  }}{{ g.pagesHasMore ? " · more than 20 in group" : "" }}
                </dd>
              </div>
            </dl>
            <ul
              v-if="g.pageIds.length > 0"
              class="flex flex-wrap gap-2"
            >
              <li v-for="pid in g.pageIds" :key="pid">
                <Button as-child size="sm" variant="outline">
                  <RouterLink :to="`/page/${pid}`">{{ pid }}</RouterLink>
                </Button>
              </li>
            </ul>
          </CardContent>
        </Card>
      </li>
    </ul>
    <p
      v-else
      class="text-muted-foreground text-sm"
    >
      No groups.
    </p>
  </div>
</template>
