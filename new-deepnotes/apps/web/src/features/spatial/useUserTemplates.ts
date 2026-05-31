import { computed, ref, watch, type Ref } from "vue";
import {
  base64ToBytes,
  createSymmetricKeyring,
  ensureSodiumReady,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";
import { unpack } from "msgpackr";

import { readSessionCrypto } from "../auth/crypto-storage";
import type { UserMe } from "../auth/useSession";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";

export interface DecryptedNoteTemplate {
  root?: { noteIdxs?: number[] };
  notes?: Array<Record<string, unknown>>;
}

export interface DecryptedArrowTemplate {
  color?: string;
  [key: string]: unknown;
}

const noteTemplate: Ref<Partial<ClipboardNote> | null> = ref(null);
const arrowTemplate: Ref<Partial<ClipboardArrow> | null> = ref(null);
const templatesLoading = ref(false);

function legacyNoteToClipboard(
  legacy: Record<string, unknown>,
): Partial<ClipboardNote> {
  const result: Partial<ClipboardNote> = {};

  if (legacy.anchor != null) {
    const a = legacy.anchor as Record<string, number>;
    result.anchor = { x: a.x ?? 0.5, y: a.y ?? 0.5 };
  }

  if (legacy.color != null) {
    const c = legacy.color as Record<string, unknown>;
    result.color = {
      inherit: (c.inherit as boolean) ?? false,
      value: (c.value as string) ?? "grey",
    };
  }

  if (legacy.width != null) {
    const w = legacy.width as Record<string, string>;
    result.width = {
      expanded: w.expanded ?? "Auto",
      collapsed: w.collapsed ?? "Auto",
    };
  }

  if (legacy.head != null) {
    const h = legacy.head as Record<string, unknown>;
    result.head = {
      enabled: (h.enabled as boolean) ?? true,
      wrap: (h.wrap as boolean) ?? true,
      height: (h.height as { expanded: string; collapsed: string }) ?? {
        expanded: "Auto",
        collapsed: "Auto",
      },
    };
  }

  if (legacy.body != null) {
    const b = legacy.body as Record<string, unknown>;
    result.body = {
      enabled: (b.enabled as boolean) ?? false,
      wrap: (b.wrap as boolean) ?? true,
      height: (b.height as { expanded: string; collapsed: string }) ?? {
        expanded: "Auto",
        collapsed: "Auto",
      },
    };
  }

  if (legacy.container != null) {
    const c = legacy.container as Record<string, unknown>;
    result.container = {
      enabled: (c.enabled as boolean) ?? false,
      spatial: (c.spatial as boolean) ?? false,
      horizontal: (c.horizontal as boolean) ?? false,
      wrapChildren: (c.wrapChildren as boolean) ?? false,
      stretchChildren: (c.stretchChildren as boolean) ?? true,
      forceColorInheritance: (c.forceColorInheritance as boolean) ?? false,
      children: (c.children as string[]) ?? [],
    };
  }

  if (legacy.collapsing != null) {
    const c = legacy.collapsing as Record<string, unknown>;
    result.collapsing = {
      enabled: (c.enabled as boolean) ?? false,
      collapsed: (c.collapsed as boolean) ?? false,
      localCollapsing: (c.localCollapsing as boolean) ?? false,
    };
  }

  if (legacy.movable != null) result.movable = legacy.movable as boolean;
  if (legacy.resizable != null) result.resizable = legacy.resizable as boolean;
  if (legacy.readOnly != null) result.readOnly = legacy.readOnly as boolean;
  if (legacy.zIndex != null) result.zIndex = legacy.zIndex as number;
  if (legacy.link != null) result.link = legacy.link as string;

  return result;
}

function legacyArrowToClipboard(
  legacy: Record<string, unknown>,
): Partial<ClipboardArrow> {
  const result: Partial<ClipboardArrow> = {};

  if (legacy.color != null) result.color = legacy.color as string;
  if (legacy.sourceHead != null) result.sourceHead = legacy.sourceHead as string;
  if (legacy.targetHead != null) result.targetHead = legacy.targetHead as string;
  if (legacy.bodyType != null) result.bodyType = legacy.bodyType as string;
  if (legacy.bodyStyle != null) result.bodyStyle = legacy.bodyStyle as string;
  if (legacy.readOnly != null) result.readOnly = legacy.readOnly as boolean;
  if (legacy.interregional != null)
    result.interregional = legacy.interregional as boolean;

  return result;
}

export function resetTemplatesForTests(): void {
  noteTemplate.value = null;
  arrowTemplate.value = null;
  templatesLoading.value = false;
}

export async function decryptUserTemplates(
  user: UserMe,
): Promise<void> {
  const stored = readSessionCrypto();
  if (stored == null) return;

  await ensureSodiumReady();
  const sessionKey = wrapSymmetricKey(base64ToBytes(stored.sessionKeyB64));
  const userId = stored.userId;

  const symmetricKeyring = createSymmetricKeyring(
    base64ToBytes(stored.encryptedSymmetricKeyringB64),
  ).unwrapSymmetric(sessionKey, {
    associatedData: {
      context: "SessionUserSymmetricKeyring",
      userId,
    },
  });

  try {
    const noteDecrypted = symmetricKeyring.decrypt(
      base64ToBytes(user.encryptedDefaultNote),
      {
        associatedData: {
          context: "UserDefaultNote",
          userId,
        },
      },
    );
    const noteObj = unpack(noteDecrypted) as DecryptedNoteTemplate;
    const rawNote: Record<string, unknown> =
      noteObj.notes && noteObj.notes.length > 0
        ? (noteObj.notes[0] ?? {})
        : {};
    noteTemplate.value = legacyNoteToClipboard(rawNote);
  } catch {
    noteTemplate.value = null;
  }

  try {
    const arrowDecrypted = symmetricKeyring.decrypt(
      base64ToBytes(user.encryptedDefaultArrow),
      {
        associatedData: {
          context: "UserDefaultArrow",
          userId,
        },
      },
    );
    const arrowObj = unpack(arrowDecrypted) as DecryptedArrowTemplate;
    arrowTemplate.value = legacyArrowToClipboard(arrowObj);
  } catch {
    arrowTemplate.value = null;
  }
}

export function useUserTemplates(user: Ref<UserMe | null>) {
  watch(
    () => user.value,
    async (u) => {
      if (u != null) {
        templatesLoading.value = true;
        try {
          await decryptUserTemplates(u);
        } finally {
          templatesLoading.value = false;
        }
      } else {
        noteTemplate.value = null;
        arrowTemplate.value = null;
      }
    },
    { immediate: true },
  );

  return {
    noteTemplate: computed(() => noteTemplate.value),
    arrowTemplate: computed(() => arrowTemplate.value),
    templatesLoading: computed(() => templatesLoading.value),
  };
}
