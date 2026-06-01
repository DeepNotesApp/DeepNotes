import { computed, ref } from "vue";

export type EditingKind = "note" | "arrow";

export interface SpatialEditing {
  editingId: typeof editingId;
  editingKind: typeof editingKind;
  isEditing: typeof isEditing;
  startEditing: typeof startEditing;
  stopEditing: typeof stopEditing;
}

const editingId = ref<string | null>(null);
const editingKind = ref<EditingKind | null>(null);

const isEditing = computed(() => (id: string) => editingId.value === id);

function startEditing(id: string, kind: EditingKind) {
  editingId.value = id;
  editingKind.value = kind;
}

function stopEditing() {
  editingId.value = null;
  editingKind.value = null;
}

export function useSpatialEditing(): SpatialEditing {
  return {
    editingId,
    editingKind,
    isEditing,
    startEditing,
    stopEditing,
  };
}
