/**
 * When true, Space must not trigger pan-mode on a spatial viewport (user is typing).
 */
export function shouldIgnoreSpaceForViewportPan(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target.closest("[contenteditable='true'], [contenteditable='']")) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
