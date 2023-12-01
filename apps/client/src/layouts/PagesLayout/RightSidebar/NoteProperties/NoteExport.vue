<template>
  <div style="padding: 20px; display: flex; flex-direction: column">
    <DeepBtn
      label="Export"
      icon="mdi-export"
      color="primary"
    >
      <q-menu
        anchor="top middle"
        self="bottom middle"
        :offset="[0, 2]"
        style="width: 244px"
        auto-close
      >
        <q-list class="bg-primary">
          <q-item
            clickable
            @click="copyAsMarkdown({ includeDescendants: false })"
          >
            <q-item-section avatar>
              <q-icon name="mdi-content-copy" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Copy as markdown</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            @click="copyAsMarkdown({ includeDescendants: true })"
          >
            <q-item-section avatar>
              <q-icon name="mdi-content-copy" />
            </q-item-section>

            <q-item-section>
              <q-item-label>
                Copy as markdown (include descendants)
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            @click="downloadAsMarkdown({ includeDescendants: false })"
          >
            <q-item-section avatar>
              <q-icon name="mdi-download" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Download as markdown</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            @click="downloadAsMarkdown({ includeDescendants: true })"
          >
            <q-item-section avatar>
              <q-icon name="mdi-download" />
            </q-item-section>

            <q-item-section>
              <q-item-label>
                Download as markdown (include descendants)
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </DeepBtn>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3';
import { saveAs } from 'file-saver';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { setClipboardText } from 'src/code/utils/clipboard';
import { handleError } from 'src/code/utils/misc';
import TurndownService from 'turndown';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

function notesToMarkdown(
  notes: PageNote[],
  params: {
    includeDescendants: boolean;
  },
) {
  let markdown = '';

  for (const [noteIndex, note] of notes.entries()) {
    if (noteIndex > 0) {
      markdown += '\n\n---\n\n';
    }

    markdown += noteToMarkdown(note, params);
  }

  return markdown;
}

function noteToMarkdown(
  note: PageNote,
  params: {
    includeDescendants: boolean;
  },
) {
  let markdown = '';

  let hasPrevSection = false;

  if (note.react.collab.head.enabled && note.react.head.editor != null) {
    markdown += editorToMarkdown(note.react.head.editor);

    hasPrevSection = true;
  }

  if (note.react.collab.body.enabled && note.react.body.editor != null) {
    if (hasPrevSection) {
      markdown += '\n\n---\n\n';
    }

    markdown += editorToMarkdown(note.react.body.editor);

    hasPrevSection = true;
  }

  if (params.includeDescendants) {
    for (const childNote of note.react.notes) {
      if (hasPrevSection) {
        markdown += '\n\n---\n\n';
      }

      markdown += noteToMarkdown(childNote, {
        includeDescendants: params.includeDescendants,
      });

      hasPrevSection = true;
    }
  }

  return markdown;
}

function editorToMarkdown(editor: Editor) {
  // Prepare HTML

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(editor.getHTML(), 'text/html');

  const divs = parsedDoc.querySelectorAll('li > div');

  for (let i = divs.length - 1; i >= 0; i--) {
    divs[i].outerHTML = divs[i].innerHTML;
  }

  const paragraphs = parsedDoc.querySelectorAll('li > p');

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    paragraphs[i].outerHTML = paragraphs[i].innerHTML;
  }

  // Convert to markdown

  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    hr: '---',
  });

  turndownService.addRule('strikethrough', {
    filter: ['s' as any],
    replacement: (content) => `~~${content}~~`,
  });
  turndownService.addRule('math-block', {
    filter: ['math-block' as any],
    replacement: (content) => `\n\n$$\n${content}\n$$\n\n`,
  });
  turndownService.addRule('inline-block', {
    filter: ['inline-math' as any],
    replacement: (content) => `$${content}$`,
  });
  turndownService.keep(['u', 'sub', 'sup', 'table', 'iframe']);

  return turndownService.turndown(parsedDoc.body.innerHTML);
}

async function copyAsMarkdown(params: { includeDescendants: boolean }) {
  await setClipboardText(
    notesToMarkdown(page.value.selection.react.notes, {
      includeDescendants: params.includeDescendants,
    }),
  );

  $quasar().notify({
    message: 'Copied as markdown.',
    type: 'positive',
  });
}

async function downloadAsMarkdown(params: { includeDescendants: boolean }) {
  try {
    const blob = new Blob(
      [
        notesToMarkdown(page.value.selection.react.notes, {
          includeDescendants: params.includeDescendants,
        }),
      ],
      {
        type: 'text/plain;charset=utf-8',
      },
    );

    if ((window as any).showSaveFilePicker == null) {
      saveAs(blob, 'DeepNotes-note.md');
    } else {
      const fileHandle = await (window as any).showSaveFilePicker({
        types: [
          {
            description: 'Markdown file',
            accept: { 'text/markdown': ['.md'] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();

      await writable.write(blob);

      await writable.close();
    }

    $quasar().notify({
      message: 'Downloaded as markdown.',
      type: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
