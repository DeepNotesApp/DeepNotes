import { ref, watch, type Ref } from "vue";

import { createDeepnotesApiClient } from "../../api/client";

export interface PageBacklink {
  pageId: string;
}

export function usePageBacklinks(pageId: Ref<string>) {
  const client = createDeepnotesApiClient();

  const backlinks = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadBacklinks() {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: apiErr } = await client.GET(
        "/api/pages/{pageId}/backlinks",
        { params: { path: { pageId: pageId.value } } },
      );
      if (apiErr) {
        error.value =
          typeof apiErr === "object" && "message" in apiErr
            ? String(apiErr.message)
            : "Failed to load backlinks.";
        backlinks.value = [];
      } else if (data) {
        backlinks.value = data.sourcePageIds ?? [];
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error.";
      backlinks.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function deleteBacklink(sourcePageId: string) {
    try {
      const { error: apiErr } = await client.DELETE(
        "/api/pages/{pageId}/backlinks/{targetPageId}",
        {
          params: {
            path: { pageId: sourcePageId, targetPageId: pageId.value },
          },
        },
      );
      if (apiErr) {
        error.value =
          typeof apiErr === "object" && "message" in apiErr
            ? String(apiErr.message)
            : "Failed to delete backlink.";
        return false;
      }
      backlinks.value = backlinks.value.filter((id) => id !== sourcePageId);
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error.";
      return false;
    }
  }

  watch(
    () => pageId.value,
    (pid) => {
      if (pid) {
        void loadBacklinks();
      } else {
        backlinks.value = [];
      }
    },
    { immediate: true },
  );

  return {
    backlinks,
    loading,
    error,
    loadBacklinks,
    deleteBacklink,
  };
}
