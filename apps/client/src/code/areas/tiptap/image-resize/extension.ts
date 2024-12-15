import Image from '@tiptap/extension-image';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import NodeView from './NodeView.vue';

export const ImageResizeExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      width: {
        default: undefined,
        renderHTML: (attribs) => ({
          width: attribs.width,
        }),
      },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(NodeView);
  },
});
