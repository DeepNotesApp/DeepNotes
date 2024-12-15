import Youtube from '@tiptap/extension-youtube';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import NodeView from './NodeView.vue';

export const YoutubeVideoExtension = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      width: {
        default: undefined,
        renderHTML: (attribs) => ({
          width: attribs.width,
        }),
      },
      height: {
        default: undefined,
        renderHTML: (attribs) => ({
          height: attribs.height,
        }),
      },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView);
  },
}).configure({
  inline: true,
});
