import { ref, onMounted } from "vue";

function readLoggedInCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("loggedIn=true"));
}

export function useAuthHint() {
  const isLoggedIn = ref(false);

  onMounted(() => {
    isLoggedIn.value = readLoggedInCookie();
  });

  return { isLoggedIn };
}
