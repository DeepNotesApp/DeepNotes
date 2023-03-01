import { EditorView } from 'prosemirror-view';

// Prosemirror fix

const oldUpdateState = EditorView.prototype.updateState;

EditorView.prototype.updateState = function (state) {
  // This prevents the matchesNode error on hot reloads
  // @ts-ignore
  if (!this.docView) {
    return;
  }

  oldUpdateState.call(this, state);
};
