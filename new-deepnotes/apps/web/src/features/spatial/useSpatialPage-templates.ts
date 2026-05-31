import * as Y from "yjs";
import { YPAGE_NOTE_KEY } from "@deepnotes/collab-wire";
import type { ClipboardNote, ClipboardArrow } from "./clipboard";

/**
 * Applies template properties to a newly created note.
 */
export function applyNoteTemplate(
  note: Y.Map<unknown>,
  template: Partial<ClipboardNote>,
) {
  if (template.width) {
    const widthMap = note.get(YPAGE_NOTE_KEY.width) as Y.Map<string>;
    widthMap.set("expanded", template.width.expanded);
    widthMap.set("collapsed", template.width.collapsed);
  }
  if (template.head) {
    const headMap = note.get(YPAGE_NOTE_KEY.head) as Y.Map<unknown>;
    headMap.set("enabled", template.head.enabled);
    headMap.set("wrap", template.head.wrap);
    const headHeightMap = headMap.get("height") as Y.Map<string>;
    headHeightMap.set("expanded", template.head.height.expanded);
    headHeightMap.set("collapsed", template.head.height.collapsed);
  }
  if (template.body) {
    const bodyMap = note.get(YPAGE_NOTE_KEY.body) as Y.Map<unknown>;
    bodyMap.set("enabled", template.body.enabled);
    bodyMap.set("wrap", template.body.wrap);
    const bodyHeightMap = bodyMap.get("height") as Y.Map<string>;
    bodyHeightMap.set("expanded", template.body.height.expanded);
    bodyHeightMap.set("collapsed", template.body.height.collapsed);
  }
  if (template.container) {
    const containerMap = note.get(YPAGE_NOTE_KEY.container) as Y.Map<unknown>;
    containerMap.set("enabled", template.container.enabled);
    containerMap.set("spatial", template.container.spatial);
    containerMap.set("horizontal", template.container.horizontal);
    containerMap.set("wrapChildren", template.container.wrapChildren);
    containerMap.set("stretchChildren", template.container.stretchChildren);
    containerMap.set("forceColorInheritance", template.container.forceColorInheritance);
  }
  if (template.collapsing) {
    const collapsingMap = note.get(YPAGE_NOTE_KEY.collapsing) as Y.Map<boolean>;
    collapsingMap.set("enabled", template.collapsing.enabled);
    collapsingMap.set("collapsed", template.collapsing.collapsed);
    collapsingMap.set("localCollapsing", template.collapsing.localCollapsing);
  }
  if (template.color) {
    const colorMap = note.get(YPAGE_NOTE_KEY.color) as Y.Map<unknown>;
    colorMap.set("inherit", template.color.inherit);
    colorMap.set("value", template.color.value);
  }
  if (template.zIndex !== undefined) {
    note.set(YPAGE_NOTE_KEY.zIndex, template.zIndex);
  }
  if (template.link !== undefined) {
    note.set(YPAGE_NOTE_KEY.link, template.link);
  }
  if (template.movable !== undefined) {
    note.set(YPAGE_NOTE_KEY.movable, template.movable);
  }
  if (template.resizable !== undefined) {
    note.set(YPAGE_NOTE_KEY.resizable, template.resizable);
  }
  if (template.readOnly !== undefined) {
    note.set(YPAGE_NOTE_KEY.readOnly, template.readOnly);
  }
  if (template.anchor) {
    const anchorMap = note.get(YPAGE_NOTE_KEY.anchor) as Y.Map<number>;
    anchorMap.set("x", template.anchor.x);
    anchorMap.set("y", template.anchor.y);
  }
  if (template.createdAt !== undefined) {
    note.set(YPAGE_NOTE_KEY.createdAt, template.createdAt);
  }
  if (template.editedAt !== undefined) {
    note.set(YPAGE_NOTE_KEY.editedAt, template.editedAt);
  }
  if (template.movedAt !== undefined) {
    note.set(YPAGE_NOTE_KEY.movedAt, template.movedAt);
  }
}

/**
 * Applies template properties to a newly created arrow.
 */
export function applyArrowTemplate(
  arrow: Y.Map<unknown>,
  template: Partial<ClipboardArrow>,
) {
  if (template.sourceAnchor !== undefined) {
    arrow.set("sourceAnchor", template.sourceAnchor);
  }
  if (template.targetAnchor !== undefined) {
    arrow.set("targetAnchor", template.targetAnchor);
  }
  if (template.sourceHead !== undefined) {
    arrow.set("sourceHead", template.sourceHead);
  }
  if (template.targetHead !== undefined) {
    arrow.set("targetHead", template.targetHead);
  }
  if (template.bodyType !== undefined) {
    arrow.set("bodyType", template.bodyType);
  }
  if (template.bodyStyle !== undefined) {
    arrow.set("bodyStyle", template.bodyStyle);
  }
  if (template.color !== undefined) {
    arrow.set("color", template.color);
  }
  if (template.readOnly !== undefined) {
    arrow.set("readOnly", template.readOnly);
  }
  if (template.interregional !== undefined) {
    arrow.set("interregional", template.interregional);
  }
  if (template.fakePos !== undefined) {
    arrow.set("fakePos", template.fakePos);
  }
  if (template.looseEndpoint !== undefined) {
    arrow.set("looseEndpoint", template.looseEndpoint);
  }
  if (template.createdAt !== undefined) {
    arrow.set("createdAt", template.createdAt);
  }
  if (template.editedAt !== undefined) {
    arrow.set("editedAt", template.editedAt);
  }
}
