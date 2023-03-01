import Image from '@tiptap/extension-image';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { once } from 'lodash';

import ImageResize from './ImageResize.client.vue';

export const ImageResizeExtension = once(() =>
  Image.extend({
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
      return VueNodeViewRenderer(ImageResize);
    },
  }),
);
