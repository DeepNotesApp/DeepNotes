import Youtube from "@tiptap/extension-youtube";
import { VueNodeViewRenderer } from "@tiptap/vue-3";

import YoutubeVideoNodeView from "./YoutubeVideoNodeView.vue";

/** Legacy parity: YouTube embeds use a Vue node view with resize handle + persisted width/height attrs. */
export const YoutubeVideoTipTapExtension = Youtube.extend({
  addNodeView() {
    return VueNodeViewRenderer(YoutubeVideoNodeView);
  },
});
