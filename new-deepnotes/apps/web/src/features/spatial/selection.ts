import { computed, ref } from "vue";

export type ElemKind = "note" | "arrow";
export type SelectedElem = { id: string; kind: ElemKind };
export type SpatialSelection = ReturnType<typeof useSpatialSelection>;

export function useSpatialSelection() {
  const selected = ref<SelectedElem[]>([]);
  const active = ref<SelectedElem | null>(null);
  const activeRegionId = ref<string | null>(null);
  const boxSelecting = ref(false);
  const boxStartScreen = ref<{ x: number; y: number } | null>(null);
  const boxEndScreen = ref<{ x: number; y: number } | null>(null);

  const selectedIds = computed(() => new Set(selected.value.map((s) => s.id)));
  const activeId = computed(() => active.value?.id ?? null);
  const hasSelection = computed(() => selected.value.length > 0);

  function isSelected(id: string) {
    return selected.value.some((s) => s.id === id);
  }

  function select(id: string, kind: ElemKind, multi = false) {
    if (!multi) {
      selected.value = [{ id, kind }];
      active.value = { id, kind };
    } else {
      const next = selected.value.filter((s) => s.id !== id);
      next.push({ id, kind });
      selected.value = next;
      active.value = { id, kind };
    }
  }

  function deselect(id: string) {
    const next = selected.value.filter((s) => s.id !== id);
    selected.value = next;
    if (active.value?.id === id) {
      active.value = next.length > 0 ? next[next.length - 1]! : null;
    }
  }

  function toggle(id: string, kind: ElemKind) {
    if (isSelected(id)) {
      deselect(id);
    } else {
      select(id, kind, true);
    }
  }

  function clear() {
    selected.value = [];
    active.value = null;
  }

  function selectAll(noteIds: string[]) {
    selected.value = noteIds.map((id) => ({ id, kind: "note" as ElemKind }));
    active.value = noteIds[0] ? { id: noteIds[0], kind: "note" } : null;
  }

  function selectedOfKind(kind: ElemKind): string[] {
    return selected.value.filter((s) => s.kind === kind).map((s) => s.id);
  }

  function startBoxSelect(screenX: number, screenY: number) {
    boxSelecting.value = true;
    boxStartScreen.value = { x: screenX, y: screenY };
    boxEndScreen.value = { x: screenX, y: screenY };
  }

  function updateBoxSelect(screenX: number, screenY: number) {
    boxEndScreen.value = { x: screenX, y: screenY };
  }

  function endBoxSelect() {
    boxSelecting.value = false;
    const start = boxStartScreen.value;
    const end = boxEndScreen.value;
    boxStartScreen.value = null;
    boxEndScreen.value = null;
    return { start, end };
  }

  const boxRect = computed(() => {
    const start = boxStartScreen.value;
    const end = boxEndScreen.value;
    if (!boxSelecting.value || !start || !end) return null;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(start.x, end.x) - x;
    const h = Math.max(start.y, end.y) - y;
    return { x, y, width: w, height: h };
  });

  return {
    selected,
    selectedIds,
    active,
    activeId,
    activeRegionId,
    hasSelection,
    boxSelecting,
    boxStartScreen,
    boxEndScreen,
    boxRect,
    isSelected,
    select,
    deselect,
    toggle,
    clear,
    selectAll,
    selectedOfKind,
    startBoxSelect,
    updateBoxSelect,
    endBoxSelect,
  };
}
