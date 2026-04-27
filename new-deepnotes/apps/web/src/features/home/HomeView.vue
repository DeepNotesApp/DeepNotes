<script setup lang="ts">
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

const { user, loading, bootstrapped, isAuthenticated } = useSession();
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
        <CardDescription>Account details from the API.</CardDescription>
      </CardHeader>
      <CardContent>
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
      <CardContent>
        <Button as-child>
          <RouterLink to="/login">Sign in</RouterLink>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
