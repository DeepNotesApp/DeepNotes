import { computed } from "vue";
import * as Y from "yjs";
import { YPAGE_NOTE_KEY } from "@deepnotes/collab-wire";

import {
  useYMapBoolean,
  useYMapNumber,
  useYMapString,
  useYMapValue,
  useYArrayValues,
} from "./yjs-reactivity";

export type NoteModel = ReturnType<typeof useNoteModel>;

/**
 * Reactive wrapper around a legacy-shaped note Y.Map.
 * Every property is a Vue ref backed by the Yjs observer so mutations
 * (local or remote) flow into the UI automatically.
 */
export function useNoteModel(noteMap: Y.Map<unknown>) {
  // --- pos ---
  const posMap = noteMap.get(YPAGE_NOTE_KEY.pos) as Y.Map<number>;
  const posX = useYMapNumber(posMap, "x", 0);
  const posY = useYMapNumber(posMap, "y", 0);
  const pos = computed(() => ({ x: posX.value, y: posY.value }));

  // --- width ---
  const widthMap = noteMap.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
  const widthExpanded = useYMapString(widthMap, "expanded", "Auto");
  const widthCollapsed = useYMapString(widthMap, "collapsed", "Auto");
  const width = computed(() => ({
    expanded: widthExpanded.value,
    collapsed: widthCollapsed.value,
  }));

  // --- height (with backfill for docs created before the field existed) ---
  if (!noteMap.has(YPAGE_NOTE_KEY.height)) {
    const heightMap = new Y.Map<string>();
    heightMap.set("expanded", "Auto");
    heightMap.set("collapsed", "Auto");
    noteMap.set(YPAGE_NOTE_KEY.height, heightMap);
  }
  const heightMap = noteMap.get(YPAGE_NOTE_KEY.height) as Y.Map<string>;
  const heightExpanded = useYMapString(heightMap, "expanded", "Auto");
  const heightCollapsed = useYMapString(heightMap, "collapsed", "Auto");
  const height = computed(() => ({
    expanded: heightExpanded.value,
    collapsed: heightCollapsed.value,
  }));

  // --- head ---
  const headMap = noteMap.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
  const headEnabled = useYMapBoolean(headMap, "enabled", true);
  const headWrap = useYMapBoolean(headMap, "wrap", true);
  const headHeightMap = headMap.get("height") as Y.Map<string>;
  const headHeightExpanded = useYMapString(headHeightMap, "expanded", "Auto");
  const headHeightCollapsed = useYMapString(headHeightMap, "collapsed", "Auto");
  const headHeight = computed(() => ({
    expanded: headHeightExpanded.value,
    collapsed: headHeightCollapsed.value,
  }));
  const headValue = useYMapValue<Y.XmlFragment>(headMap, "value");

  // --- body ---
  const bodyMap = noteMap.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
  const bodyEnabled = useYMapBoolean(bodyMap, "enabled", false);
  const bodyWrap = useYMapBoolean(bodyMap, "wrap", true);
  const bodyHeightMap = bodyMap.get("height") as Y.Map<string>;
  const bodyHeightExpanded = useYMapString(bodyHeightMap, "expanded", "Auto");
  const bodyHeightCollapsed = useYMapString(bodyHeightMap, "collapsed", "Auto");
  const bodyHeight = computed(() => ({
    expanded: bodyHeightExpanded.value,
    collapsed: bodyHeightCollapsed.value,
  }));
  const bodyValue = useYMapValue<Y.XmlFragment>(bodyMap, "value");

  // --- container ---
  const containerMap = noteMap.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
  const containerEnabled = useYMapBoolean(containerMap, "enabled", false);
  const containerSpatial = useYMapBoolean(containerMap, "spatial", false);
  const containerHorizontal = useYMapBoolean(containerMap, "horizontal", false);
  const containerWrapChildren = useYMapBoolean(
    containerMap,
    "wrapChildren",
    false,
  );
  const containerStretchChildren = useYMapBoolean(
    containerMap,
    "stretchChildren",
    true,
  );
  const containerForceColorInheritance = useYMapBoolean(
    containerMap,
    "forceColorInheritance",
    false,
  );
  const containerChildrenArr = containerMap.get("children") as Y.Array<string>;
  const containerChildren = useYArrayValues<string>(containerChildrenArr);

  // Runtime-only properties (not in Yjs schema, computed locally)
  const containerOverflow = computed(() => {
    // overflow is true when children exceed container bounds
    // simplified: computed based on spatial + children count for now
    if (!containerEnabled.value) return false;
    if (containerSpatial.value) return false;
    // Non-spatial containers with many children may overflow
    return containerChildren.value.length > 0;
  });

  // --- collapsing ---
  const collapsingMap = noteMap.get(
    YPAGE_NOTE_KEY.collapsing,
  ) as Y.Map<boolean>;
  const collapsingEnabled = useYMapBoolean(collapsingMap, "enabled", false);
  const collapsingCollapsed = useYMapBoolean(collapsingMap, "collapsed", false);
  const collapsingLocalCollapsing = useYMapBoolean(
    collapsingMap,
    "localCollapsing",
    false,
  );

  // --- color ---
  const colorMap = noteMap.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
  const colorInherit = useYMapBoolean(colorMap, "inherit", false);
  const colorValue = useYMapString(colorMap, "value", "grey");
  const color = computed(() => ({
    inherit: colorInherit.value,
    value: colorValue.value,
  }));

  // --- primitives ---
  const zIndex = useYMapNumber(noteMap, YPAGE_NOTE_KEY.zIndex, -1);
  const link = useYMapString(noteMap, YPAGE_NOTE_KEY.link, "");
  const movable = useYMapBoolean(noteMap, YPAGE_NOTE_KEY.movable, true);
  const resizable = useYMapBoolean(noteMap, YPAGE_NOTE_KEY.resizable, true);
  const readOnly = useYMapBoolean(noteMap, YPAGE_NOTE_KEY.readOnly, false);
  const anchorMap = noteMap.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
  const anchorX = useYMapNumber(anchorMap, "x", 0.5);
  const anchorY = useYMapNumber(anchorMap, "y", 0.5);
  const anchor = computed(() => ({ x: anchorX.value, y: anchorY.value }));
  const regionId = useYMapValue<string | null>(noteMap, YPAGE_NOTE_KEY.regionId);
  const createdAt = useYMapValue<number | null>(noteMap, YPAGE_NOTE_KEY.createdAt);
  const editedAt = useYMapValue<number | null>(noteMap, YPAGE_NOTE_KEY.editedAt);
  const movedAt = useYMapValue<number | null>(noteMap, YPAGE_NOTE_KEY.movedAt);

  return {
    pos,
    posX,
    posY,
    width,
    widthExpanded,
    widthCollapsed,
    height,
    heightExpanded,
    heightCollapsed,
    head: {
      enabled: headEnabled,
      wrap: headWrap,
      height: headHeight,
      value: headValue,
    },
    body: {
      enabled: bodyEnabled,
      wrap: bodyWrap,
      height: bodyHeight,
      value: bodyValue,
    },
    container: {
      enabled: containerEnabled,
      spatial: containerSpatial,
      horizontal: containerHorizontal,
      wrapChildren: containerWrapChildren,
      stretchChildren: containerStretchChildren,
      forceColorInheritance: containerForceColorInheritance,
      overflow: containerOverflow,
      children: containerChildren,
    },
    collapsing: {
      enabled: collapsingEnabled,
      collapsed: collapsingCollapsed,
      localCollapsing: collapsingLocalCollapsing,
    },
    color,
    colorValue,
    colorInherit,
    zIndex,
    link,
    movable,
    resizable,
    readOnly,
    anchor,
    anchorX,
    anchorY,
    regionId,
    createdAt,
    editedAt,
    movedAt,
    rawMap: noteMap,
  };
}
