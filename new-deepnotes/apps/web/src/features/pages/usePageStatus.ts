import { computed, type Ref } from "vue";

export type PageStatus =
  | "loading"
  | "error"
  | "page-nonexistent"
  | "page-deleted"
  | "group-deleted"
  | "invited"
  | "rejected"
  | "unauthorized"
  | "password"
  | "success";

export function usePageStatus(opts: {
  collabLoading: Ref<boolean>;
  loadError: Ref<string | null>;
  cryptoError: Ref<string | null>;
  pageId: Ref<string>;
}) {
  const { collabLoading, loadError, cryptoError, pageId } = opts;

  const status = computed<PageStatus>(() => {
    if (collabLoading.value) {
      return "loading";
    }

    const le = loadError.value;
    const ce = cryptoError.value;

    if (le != null) {
      const lower = le.toLowerCase();
      if (
        lower.includes("404") ||
        lower.includes("not found") ||
        lower.includes("page not found")
      ) {
        return "page-nonexistent";
      }
      if (
        lower.includes("403") ||
        lower.includes("forbidden") ||
        lower.includes("insufficient permissions")
      ) {
        return "unauthorized";
      }
      return "error";
    }

    if (ce != null) {
      const lower = ce.toLowerCase();
      if (lower.includes("password") || lower.includes("incorrect password")) {
        return "password";
      }
      return "error";
    }

    if (pageId.value === "") {
      return "error";
    }

    return "success";
  });

  return { status };
}
