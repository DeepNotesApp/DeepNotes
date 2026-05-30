# Spatial Architecture Decision: SyncedStore vs Hybrid Reactive Proxy

> **Status:** Decided — Option C (hybrid reactive proxy)  
> **Date:** 2026-05-30  
> **Context:** Phase 3 of RESTART_PLAN.md

## Problem

Legacy DeepNotes uses `@syncedstore/core` to create reactive Vue proxies over Yjs shared types. SyncedStore automatically converts Y.Map/Y.Array mutations into Vue reactivity updates, so components re-render when CRDT state changes.

The new repo does not include SyncedStore. Before building the spatial canvas (Phases 6–7), we must decide how Vue components will react to Yjs note/arrow mutations.

## Options Evaluated

### Option A — `@syncedstore/core`

Use SyncedStore exactly as legacy does:

```ts
import { getYjsValue } from '@syncedstore/core';
const store = syncedStore({ page: {}, notes: {}, arrows: {} });
```

- **Pros:** Identical to legacy; minimal code changes for parity; handles nested reactivity automatically.
- **Cons:**
  - Bundling risk with Vite 6 + Vue 3.5. SyncedStore uses internal Yjs APIs and `@reactivedata/reactive-crdt`, which may break in future bundler updates.
  - Additional dependency (~40 KB gzipped) for functionality we can replicate in ~200 lines.
  - Vue 3.5's new reactivity primitives (`watch`, `triggerRef`) may conflict with SyncedStore's proxy layer.

### Option B — Raw Yjs + manual `watchEffect`

Directly call `ydoc.getMap('notes').observe()` in every component and manually wire `ref()` updates.

- **Pros:** Zero new dependencies.
- **Cons:** Extremely verbose; every component needs its own observer lifecycle; easy to leak observers or miss deep changes.

### Option C — Hybrid Reactive Proxy (chosen)

Build a thin layer of composables that observe Yjs types and expose Vue `ref()`/`computed()` values:

```ts
export function useYMap<K, V>(ymap: Y.Map<V>) {
  const map = ref<Record<K, V>>({});
  ymap.observe(() => { map.value = Object.fromEntries(ymap.entries()) as Record<K, V>; });
  return map;
}

export function useYArray<T>(yarr: Y.Array<T>) {
  const arr = ref<T[]>([]);
  yarr.observe(() => { arr.value = yarr.toArray(); });
  return arr;
}
```

- **Pros:**
  - No external dependencies beyond `yjs`.
  - Full control over reactivity granularity; we can batch updates or debounce as needed.
  - Works reliably with Vite 6, Vue 3.5, and future Vue versions.
  - Easier to test and debug than SyncedStore's opaque proxy layer.
- **Cons:**
  - Requires writing ~200–400 lines of observer composables.
  - Developers must learn the hybrid pattern (instead of SyncedStore's transparent proxies).

## Decision

**Adopt Option C (hybrid reactive proxy).**

Rationale:
1. The new repo already avoids `@syncedstore/core` and has no bundling or maintenance debt for it.
2. Vue 3.5's reactivity system is powerful enough that a thin observer wrapper is trivial and robust.
3. If SyncedStore releases a Vite-6-compatible version later, we can revisit this decision without architectural disruption — the Yjs doc shape is the same.

## Implementation Notes

- Create `apps/web/src/features/spatial/yjs-reactivity.ts` with `useYMap`, `useYArray`, `useYXmlFragment`, `useYValue` helpers.
- For nested objects (e.g., `note.pos.x`), use `computed(() => noteMap.value.pos?.x)` or deep-watch the parent map.
- For `Y.XmlFragment` (head/body/label), expose a `ref()` to the fragment and let Tiptap's `y-prosemirror` bind directly to it.

## Exit Criteria

- [x] Decision documented.
- [ ] `yjs-reactivity.ts` composables created and unit-tested.
- [ ] Component test: mount a note card, mutate `note.pos.x` via Yjs, assert Vue re-renders within 1 tick.
