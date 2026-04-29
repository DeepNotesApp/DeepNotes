import { removeAwarenessStates, type Awareness } from "y-protocols/awareness";

export function cursorColorForUserId(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = userId.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 65% 42%)`;
}

export function clearRemoteCollabAwareness(a: Awareness) {
  const self = a.doc.clientID;
  const others = Array.from(a.getStates().keys()).filter((id) => id !== self);
  if (others.length > 0) {
    removeAwarenessStates(a, others, "page-load");
  }
}
