<template>
  <div style="padding: 20px; display: flex; flex-direction: column">
    <div style="display: flex">
      <Checkbox
        label="Container"
        class="container-checkbox"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.container.enabled"
        @update:model-value="
          (event) => {
            changeProp(event, (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.container.enabled = value;
            });

            if (internals.pages.react.tutorialStep === 3) {
              internals.pages.react.tutorialStep++;
            }
          }
        "
      >
        <TutorialTooltip
          v-if="
            internals.pages.react.isNewUser &&
            internals.pages.react.tutorialStep === 3
          "
          ref="containerTooltip"
          pos="bottom"
        >
          <div v-html="containerTooltipHTML"></div>
        </TutorialTooltip>
      </Checkbox>

      <Gap style="width: 16px" />

      <Checkbox
        label="Spatial"
        :model-value="note.react.collab.container.spatial"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.container.spatial = value;
          })
        "
        :disable="page.react.readOnly || !note.react.collab.container.enabled"
      />
    </div>

    <Gap style="height: 16px" />

    <div style="display: flex">
      <Checkbox
        label="Horizontal"
        :model-value="note.react.collab.container.horizontal"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.container.horizontal = value;
          })
        "
        :disable="
          page.react.readOnly ||
          !note.react.collab.container.enabled ||
          note.react.collab.container.spatial
        "
      />

      <Gap style="width: 16px" />

      <Checkbox
        label="Stretch children"
        :model-value="note.react.collab.container.stretchChildren"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.container.stretchChildren = value;
          })
        "
        :disable="
          page.react.readOnly ||
          !note.react.collab.container.enabled ||
          note.react.collab.container.horizontal ||
          note.react.collab.container.spatial
        "
      />
    </div>

    <Gap style="height: 16px" />

    <Checkbox
      label="Wrap children"
      :model-value="note.react.collab.container.wrapChildren"
      @update:model-value="
        changeProp($event, (selectedNote, value) => {
          selectedNote.react.collab.container.wrapChildren = value;
        })
      "
      :disable="
        page.react.readOnly ||
        !note.react.collab.container.enabled ||
        note.react.collab.container.spatial
      "
    />

    <Gap style="height: 16px" />

    <Checkbox
      label="Force color inheritance"
      :model-value="note.react.collab.container.forceColorInheritance"
      @update:model-value="
        changeProp($event, (selectedNote, value) => {
          selectedNote.react.collab.container.forceColorInheritance = value;
        })
      "
      :disable="page.react.readOnly || !note.react.collab.container.enabled"
    />

    <Gap style="height: 24px" />

    <DeepBtn
      label="Reverse children"
      icon="mdi-swap-vertical"
      :disable="
        page.react.readOnly ||
        note.react.collab.container.spatial ||
        note.react.notes.length < 2
      "
      color="primary"
      @click="
        changeProp($event, (selectedNote, value) => {
          selectedNote.reverseChildren();
        })
      "
    />

    <Gap style="height: 16px" />

    <input
      ref="fileInput"
      style="display: none"
      type="file"
      accept=".txt, .md"
      multiple
      @change="onFileChange"
    />

    <DeepBtn
      label="Import children from files"
      icon="mdi-import"
      :disable="
        page.react.readOnly ||
        (note.react.collab.container.enabled && note.react.container.spatial)
      "
      color="primary"
      @click="importChildrenFromFiles"
    />
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import showdown from 'showdown';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import TutorialTooltip from 'src/components/TutorialTooltip.vue';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const note = computed(() => page.value.activeElem.react.value as PageNote);

const containerTooltipHTML =
  'Click here to enable<br/> the <b>note container</b>.<br/>This allows to place<br/>notes within eachother.';

const containerTooltip = ref<InstanceType<typeof TutorialTooltip>>();

useIntervalFn(() => {
  if (internals.pages.react.isNewUser) {
    containerTooltip.value?.updatePosition();
  }
}, 1);

const fileInput = ref<HTMLInputElement>();

function changeProp(value: any, func: (note: PageNote, value: any) => void) {
  page.value.collab.doc.transact(() => {
    for (const selectedNote of page.value.selection.react.notes) {
      func(selectedNote, value);
    }
  });
}

async function createChildFromFile(file: File) {
  const fileReader = new FileReader();

  fileReader.onload = async (event) => {
    const content = String(event.target?.result ?? '');

    const childNote = await page.value.notes.create({
      region: note.value,
      center: false,
      edit: false,
    });

    if (childNote != null) {
      childNote.react.collab.head.enabled = true;
      childNote.react.collab.body.enabled = false;
      childNote.react.collab.container.enabled = false;

      if (file.name.endsWith('.md')) {
        const converter = new showdown.Converter({
          emoji: true,
          parseImgDimensions: true,
          strikethrough: true,
          tables: true,
          underline: true,
        });

        converter.addExtension(() => [
          {
            type: 'output',
            regex: /\$(.+?)\$/g,
            replace: '<inline-math>$1</inline-math>',
          },
          {
            type: 'output',
            regex: /\$\$((?:.|\n)+?)\$\$/g,
            replace: '<math-block>$1</math-block>',
          },
        ]);

        const initialHTML = converter
          .makeHtml(content)
          .replaceAll('\n', '')
          .replaceAll(/<br \/> +/g, '<br />');

        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(initialHTML, 'text/html');

        // Fix math blocks

        for (const mathBlock of Array.from(
          parsedDoc.querySelectorAll('p > math-block'),
        )) {
          mathBlock.parentElement!.outerHTML = mathBlock.outerHTML;
        }

        // Fix blockquotes

        for (const paragraph of Array.from(
          parsedDoc.querySelectorAll('blockquote > p'),
        )) {
          paragraph.parentElement!.innerHTML = paragraph.outerHTML;
        }

        const finalHTML = parsedDoc.body.innerHTML;

        childNote.react.editors[0]?.commands.insertContent(finalHTML);
      } else {
        childNote.react.editors[0]?.commands.insertContent(content);
      }
    }
  };

  fileReader.readAsText(file);
}

async function importChildrenFromFilesAux(files: File[]) {
  note.value.react.collab.container.enabled = true;
  note.value.react.collab.container.spatial = false;

  for (const file of files) {
    await createChildFromFile(file);
  }
}

async function onFileChange() {
  if (fileInput.value?.files == null || fileInput.value.files.length === 0) {
    return;
  }

  await importChildrenFromFilesAux(Array.from(fileInput.value.files));

  fileInput.value = undefined;
}

async function importChildrenFromFiles() {
  if ((window as any).showOpenFilePicker == null) {
    fileInput.value?.click();
  } else {
    const fileHandles = await (window as any).showOpenFilePicker({
      multiple: true,

      types: [
        {
          description: 'Markdown file',
          accept: { 'text/markdown': ['.md'] },
        },
      ],
    });

    const files = await Promise.all(
      fileHandles.map((fileHandle: any) => fileHandle.getFile()),
    );

    await importChildrenFromFilesAux(files);
  }
}
</script>
