import type { Y } from '@syncedstore/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as tiptapModule from '@tiptap/vue-3';
import { once } from 'lodash';
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from 'y-prosemirror';

import { extensions } from './extensions.client';

export function swapXmlFragments(frag1: Y.XmlFragment, frag2: Y.XmlFragment) {
  const json1 = yXmlFragmentToProsemirrorJSON(frag1);
  const json2 = yXmlFragmentToProsemirrorJSON(frag2);

  prosemirrorJSONToYXmlFragment(internals.tiptap().schema, json2, frag1);
  prosemirrorJSONToYXmlFragment(internals.tiptap().schema, json1, frag2);
}

export const tiptap = once(() => ({
  ...tiptapModule,

  extensions,
  schema: tiptapModule.getSchema(extensions()),

  Collaboration,
  CollaborationCursor,

  swapXmlFragments,
}));

internals.tiptap = tiptap;
