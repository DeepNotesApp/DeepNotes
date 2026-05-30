import { computed } from "vue";
import * as Y from "yjs";
import { YPAGE_ARROW_KEY } from "@deepnotes/collab-wire";

import {
  useYMapBoolean,
  useYMapString,
  useYMapValue,
} from "./yjs-reactivity";

export type ArrowModel = ReturnType<typeof useArrowModel>;

export function useArrowModel(arrowMap: any) {
  const source = useYMapString(arrowMap, YPAGE_ARROW_KEY.source, "");
  const target = useYMapString(arrowMap, YPAGE_ARROW_KEY.target, "");

  const sourceAnchor = useYMapValue<{ x: number; y: number } | null>(
    arrowMap,
    YPAGE_ARROW_KEY.sourceAnchor,
  );
  const targetAnchor = useYMapValue<{ x: number; y: number } | null>(
    arrowMap,
    YPAGE_ARROW_KEY.targetAnchor,
  );

  const sourceHead = useYMapString(arrowMap, YPAGE_ARROW_KEY.sourceHead, "none");
  const targetHead = useYMapString(arrowMap, YPAGE_ARROW_KEY.targetHead, "open");
  const bodyType = useYMapString(arrowMap, YPAGE_ARROW_KEY.bodyType, "curve");
  const bodyStyle = useYMapString(arrowMap, YPAGE_ARROW_KEY.bodyStyle, "solid");

  const label = useYMapValue<Y.XmlFragment>(arrowMap, YPAGE_ARROW_KEY.label);
  const color = useYMapString(arrowMap, YPAGE_ARROW_KEY.color, "grey");
  const readOnly = useYMapBoolean(arrowMap, YPAGE_ARROW_KEY.readOnly, false);
  const interregional = useYMapBoolean(
    arrowMap,
    YPAGE_ARROW_KEY.interregional,
    false,
  );
  const fakePos = useYMapValue<{ x: number; y: number } | null>(
    arrowMap,
    YPAGE_ARROW_KEY.fakePos,
  );
  const looseEndpoint = useYMapValue<"source" | "target" | null>(
    arrowMap,
    YPAGE_ARROW_KEY.looseEndpoint,
  );
  const createdAt = useYMapValue<number | null>(
    arrowMap,
    YPAGE_ARROW_KEY.createdAt,
  );
  const editedAt = useYMapValue<number | null>(
    arrowMap,
    YPAGE_ARROW_KEY.editedAt,
  );
  const regionId = useYMapValue<string | null>(arrowMap, YPAGE_ARROW_KEY.regionId);

  return {
    source,
    target,
    sourceAnchor,
    targetAnchor,
    sourceHead,
    targetHead,
    bodyType,
    bodyStyle,
    label,
    color,
    readOnly,
    interregional,
    fakePos,
    looseEndpoint,
    createdAt,
    editedAt,
    regionId,
  };
}
