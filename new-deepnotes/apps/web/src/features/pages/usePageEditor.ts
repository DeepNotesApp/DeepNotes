import { useEditor } from "@tiptap/vue-3";
import { base64ToBytes, type SymmetricKeyring } from "@deepnotes/e2ee";
import type { ComputedRef, Ref } from "vue";
import { onBeforeUnmount, ref, watch } from "vue";
import * as Y from "yjs";

import type { DeepnotesApiClient } from "@/api/client";

import type { UserMe } from "../auth/useSession";
import { clearRemoteCollabAwareness } from "./page-awareness-utils";
import { decryptPageDocUpdate } from "./page-collab-crypto";
import { clearYjsProseMirrorAndLegacyText } from "./page-collab-yjs-clear";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import {
  createPageEditorTipTapExtensions,
  PAGE_EDITOR_TIPTAP_CLASS,
} from "./page-editor-tiptap-extensions";
import { refreshSnapshotList, type SnapshotRow } from "./page-snapshot-list";

export function usePageEditor(opts: {
  ydoc: Y.Doc;
  collabCaretProvider: { awareness: import("y-protocols/awareness").Awareness };
  pageId: ComputedRef<string>;
  user: Ref<UserMe | null>;
  bootstrapped: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
  client: DeepnotesApiClient;
  pageKeyring: Ref<SymmetricKeyring | null>;
  snapshots: Ref<SnapshotRow[]>;
  snapshotLoading: Ref<boolean>;
  collabGroupCrypto: Ref<{
    groupId: string;
    groupEncryptedContentKeyring: Uint8Array;
    memberEncryptedAccessKeyring: Uint8Array | null;
    groupAccessKeyring: Uint8Array | null;
  } | null>;
  schedulePush: () => void;
  syncServerDocToYdoc: () => void;
}) {
  const {
    ydoc,
    collabCaretProvider,
    pageId,
    user,
    bootstrapped,
    isAuthenticated,
    client,
    pageKeyring,
    snapshots,
    snapshotLoading,
    schedulePush,
    syncServerDocToYdoc,
  } = opts;

  const legacyPlainToImport = ref<string | null>(null);
  const loadError = ref<string | null>(null);
  const collabLoading = ref(true);
  const hydrating = ref(false);
  const updateCount = ref(0);
  const yStateBytes = ref(0);
  const collabGroupId = ref<string | null>(null);
  const moveDestGroupId = ref("");
  const pageEncRelTitleB64 = ref<string | null>(null);
  const pageEncAbsTitleB64 = ref<string | null>(null);
  const collabEncryptedUpdatesForMove = ref<Uint8Array[]>([]);
  const collabReloadNonce = ref(0);

  const editor = useEditor({
    extensions: createPageEditorTipTapExtensions({ ydoc, collabCaretProvider }),
    editorProps: {
      attributes: {
        class: PAGE_EDITOR_TIPTAP_CLASS,
      },
    },
    onUpdate() {
      refreshYMetrics();
      if (!hydrating.value) {
        schedulePush();
      }
    },
    editable: false,
  });

  function refreshYMetrics() {
    yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
  }

  function setEditorEditable(on: boolean) {
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.setEditable(on);
    }
  }

  onBeforeUnmount(() => {
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.destroy();
    }
  });

  watch(
    [editor, legacyPlainToImport],
    () => {
      const ed = editor.value;
      const t = legacyPlainToImport.value;
      if (ed == null || ed.isDestroyed || t == null) {
        return;
      }
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: t.length > 0 ? [{ type: "text", text: t }] : [],
          },
        ],
      });
      legacyPlainToImport.value = null;
      syncServerDocToYdoc();
      refreshYMetrics();
    },
    { flush: "post" },
  );

  watch(
    [bootstrapped, isAuthenticated, pageId, collabReloadNonce],
    async () => {
      if (!bootstrapped.value) {
        return;
      }
      if (!isAuthenticated.value) {
        return;
      }
      const id = pageId.value;
      if (!id) {
        return;
      }
      collabGroupId.value = null;
      pageEncRelTitleB64.value = null;
      pageEncAbsTitleB64.value = null;
      collabEncryptedUpdatesForMove.value = [];
      snapshots.value = [];
      loadError.value = null;
      collabLoading.value = true;
      pageKeyring.value = null;
      try {
        const { data, error, response } = await client.GET(
          "/api/pages/{pageId}/collab-updates",
          { params: { path: { pageId: id } } },
        );
        if (response.status !== 200 || !data) {
          if (error && typeof error === "object" && "message" in error) {
            loadError.value = String((error as { message: string }).message);
          } else {
            loadError.value = "Could not load collab state.";
          }
          return;
        }

        collabGroupId.value = data.groupId;
        pageEncRelTitleB64.value = data.pageEncryptedRelativeTitle;
        pageEncAbsTitleB64.value = data.pageEncryptedAbsoluteTitle;
        collabEncryptedUpdatesForMove.value = data.updates.map((u) =>
          base64ToBytes(u.encryptedData),
        );
        updateCount.value = data.updates.length;

        if (user.value?.demo === true) {
          hydrating.value = true;
          try {
            clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
          } finally {
            hydrating.value = false;
          }
          syncServerDocToYdoc();
          refreshYMetrics();
          return;
        }

        hydrating.value = true;
        try {
          clearRemoteCollabAwareness(collabCaretProvider.awareness);
          clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
          for (const u of data.updates) {
            const plain = decryptPageDocUpdate({
              pageKeyring: pageKeyring.value!,
              pageId: id,
              ciphertext: base64ToBytes(u.encryptedData),
            });
            Y.applyUpdateV2(ydoc, plain);
          }
          const legacyAfter = ydoc.getText(Y_TEXT_DEFAULT);
          if (legacyAfter.length > 0) {
            legacyPlainToImport.value = legacyAfter.toString();
            ydoc.transact(() => {
              legacyAfter.delete(0, legacyAfter.length);
            });
          }
          syncServerDocToYdoc();
          refreshYMetrics();
        } finally {
          hydrating.value = false;
        }
        void refreshSnapshotList({
          client,
          pageId: id,
          user: user.value,
          snapshots,
          snapshotLoading,
        });
      } finally {
        collabLoading.value = false;
      }
    },
    { immediate: true },
  );

  watch(
    [collabLoading, loadError, editor],
    () => {
      const canEdit =
        !collabLoading.value &&
        loadError.value == null &&
        user.value?.demo !== true;
      setEditorEditable(canEdit);
    },
    { immediate: true, flush: "post" },
  );

  return {
    editor,
    legacyPlainToImport,
    loadError,
    collabLoading,
    hydrating,
    updateCount,
    yStateBytes,
    collabGroupId,
    moveDestGroupId,
    pageEncRelTitleB64,
    pageEncAbsTitleB64,
    collabEncryptedUpdatesForMove,
    collabReloadNonce,
    refreshYMetrics,
    setEditorEditable,
  };
}
