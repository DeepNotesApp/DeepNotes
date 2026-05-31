import type { Ref } from "vue";

import type { DeepnotesApiClient } from "@/api/client";
import type { components } from "@/api/api-types.generated";

export type SnapshotRow = components["schemas"]["PageSnapshotListItem"];

export async function refreshSnapshotList(opts: {
  client: DeepnotesApiClient;
  pageId: string;
  snapshots: Ref<SnapshotRow[]>;
  snapshotLoading: Ref<boolean>;
}): Promise<void> {
  const { client, pageId, snapshots, snapshotLoading } = opts;
  if (!pageId) {
    snapshots.value = [];
    return;
  }
  snapshotLoading.value = true;
  try {
    const res = await client.GET("/api/pages/{pageId}/snapshots", {
      params: { path: { pageId } },
    });
    if (res.response.status === 200 && res.data) {
      snapshots.value = res.data.snapshots;
    } else {
      snapshots.value = [];
    }
  } finally {
    snapshotLoading.value = false;
  }
}
