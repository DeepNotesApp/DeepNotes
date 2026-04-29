<script setup lang="ts">
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

defineProps<{
  moveDestGroupId: string;
  collabLoading: boolean;
  loadError: string | null;
  cryptoError: string | null;
  collabGroupId: string | null;
}>();

defineEmits<{
  "update:moveDestGroupId": [value: string];
  moveToGroup: [];
  setAsMainPage: [];
  softDelete: [];
  purge: [];
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">Page management</CardTitle>
      <CardDescription>
        Main-page promotion uses
        <code class="font-mono text-xs">POST …/move</code>
        with the same group id (Pro). Cross-group move re-encrypts ciphertext client-side. Soft-delete and purge use
        <code class="font-mono text-xs">DELETE …/pages/:id</code>
        and
        <code class="font-mono text-xs">POST …/purge</code>.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="move-dest-gid" class="text-muted-foreground text-xs">
          Move to group id (21-char nanoid, Pro)
        </Label>
        <div class="flex flex-wrap items-end gap-2">
          <Input
            id="move-dest-gid"
            class="max-w-md font-mono text-xs"
            placeholder="Destination group id"
            :disabled="collabLoading || loadError != null || cryptoError != null"
            :model-value="moveDestGroupId"
            @update:model-value="
              $emit('update:moveDestGroupId', $event == null ? '' : String($event))
            "
          />
          <Button
            size="sm"
            variant="secondary"
            :disabled="collabLoading || loadError != null || cryptoError != null"
            @click="$emit('moveToGroup')"
          >
            Move to group…
          </Button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          :disabled="collabGroupId == null || collabLoading"
          @click="$emit('setAsMainPage')"
        >
          Set as group main page
        </Button>
        <Button
          size="sm"
          variant="destructive"
          @click="$emit('softDelete')"
        >
          Soft-delete page…
        </Button>
        <Button
          size="sm"
          variant="destructive"
          @click="$emit('purge')"
        >
          Purge page permanently…
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
