<template>
  <editor-content class="text-editor" />
</template>

<script setup lang="ts">
const EditorContent = internals.tiptap().EditorContent;

type _EditorContent = typeof EditorContent;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends _EditorContent {
  //
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.text-editor {
  :deep() {
    .ProseMirror {
      outline: none;

      width: max-content;

      font-size: 13px;

      touch-action: pan-x pan-y !important;

      &[contenteditable='false'] {
        img,
        hr {
          -webkit-user-drag: none;
        }
      }

      p {
        margin-bottom: 0;
      }

      > * + * {
        margin-top: 10px;
      }

      > * + hr,
      > hr + * {
        margin-top: 14px;
      }

      > * + .tableWrapper,
      > .tableWrapper + * {
        margin-top: 14px;
      }

      table {
        border-collapse: collapse;

        td,
        th {
          border: 1px solid #ccc;

          padding: 2px 5px;

          vertical-align: top;

          position: relative;
        }
        th {
          font-weight: unset;
          text-align: unset;
        }

        .selectedCell:after {
          background: rgba(200, 200, 255, 0.4);
          content: '';
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }

        .column-resize-handle {
          background-color: #adf;
          bottom: -2px;
          position: absolute;
          right: -2px;
          pointer-events: none;
          top: 0;
          width: 4px;
        }
      }

      &.resize-cursor {
        cursor: ew-resize;
        cursor: col-resize;
      }

      ul,
      ol {
        margin: 0;
      }
      ul:not([data-type]) {
        padding-inline-start: 24px;

        > li::marker {
          content: '• ';
          font-size: 15px;
        }
      }
      ol {
        padding-inline-start: 24px;
      }

      ul[data-type='taskList'] {
        padding-inline-start: 5px;

        li {
          display: flex;

          > label {
            flex: none;
            user-select: none;
            width: 19px;

            > input {
              position: relative;
              top: 2px;
            }
          }

          > div {
            flex: 1 1 auto;
          }
        }
      }

      code:not(pre > code) {
        border-radius: 0.3em;

        box-decoration-break: clone;

        padding: 0.25em;

        color: #fff;

        background: #202020;
      }

      pre {
        margin: 5px 0;
        border-radius: 0.4rem;
        padding: 0.4rem 0.5rem;

        background: #202020;
      }

      h1,
      h2,
      h3 {
        margin-block-start: 0;
        margin-block-end: 0;
      }
      h1 {
        font-size: 2.2em;
      }
      h2 {
        font-size: 1.6em;
      }
      h3 {
        font-size: 1.2em;
      }

      hr {
        border: none;
        height: 1px;
        background-color: rgba(255, 255, 255, 0.35);
      }

      a {
        color: #47a7ff !important;
      }

      blockquote {
        margin-left: 4px;
        margin-right: 0px;

        border-left: 5px solid rgba(#fff, 0.5);

        padding-left: 1.3rem;
      }

      .collaboration-cursor__base {
        position: relative;

        pointer-events: none;
      }
      .collaboration-cursor__base:hover {
        opacity: 0.3;
      }
      .collaboration-cursor__caret {
        position: absolute;

        top: 0;
        bottom: 0;
        left: -1px;
        right: -1px;
      }
      .collaboration-cursor__label {
        position: absolute;
        white-space: nowrap;

        border-radius: 3px;
        border-top-left-radius: 0px;

        padding: 0px 3px;

        left: -1px;
        bottom: 0px;

        transform: translateY(100%);

        font-size: 12px;

        z-index: 2147483647;

        user-select: none;
        pointer-events: auto;
      }

      .ProseMirror-separator {
        display: none !important;
      }

      .ProseMirror-gapcursor:after {
        border-top: 1px solid white;
      }
    }
  }
}
</style>
