<template>
  <q-list>
    <MiniSidebarBtn
      tooltip="Create new page"
      icon="mdi-note-plus"
      :disable="page.react.readOnly"
      @click="showNewPageDialog()"
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 4
        "
        pos="left"
      >
        <div v-html="newPageTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <q-separator />

    <MiniSidebarBtn
      tooltip="Head"
      icon="mdi-page-layout-header"
      :disable="page.react.readOnly"
      :active="note.react.collab.head.enabled"
      @click="
        changeProp(!note.react.collab.head.enabled, (selectedNote, value) => {
          selectedNote.react.collab.body.enabled ||=
            selectedNote.react.numEnabledSections === 1 && !value;
          selectedNote.react.collab.head.enabled = value;
        })
      "
    />

    <MiniSidebarBtn
      tooltip="Swap head and body"
      icon="mdi-cached"
      :disable="page.react.readOnly"
      @click="
        changeProp(null, (note) => {
          internals
            .tiptap()
            .swapXmlFragments(
              note.react.collab.head.value,
              note.react.collab.body.value,
            );
        })
      "
    />

    <MiniSidebarBtn
      tooltip="Body"
      icon="mdi-page-layout-body"
      :disable="page.react.readOnly"
      :active="note.react.collab.body.enabled"
      @click="
        () => {
          changeProp(!note.react.collab.body.enabled, (selectedNote, value) => {
            selectedNote.react.collab.head.enabled ||=
              selectedNote.react.numEnabledSections === 1 && !value;
            selectedNote.react.collab.body.enabled = value;
          });

          if (internals.pages.react.tutorialStep === 1) {
            internals.pages.react.tutorialStep++;
          }
        }
      "
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 1
        "
        pos="left"
      >
        <div v-html="bodyTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <q-separator />

    <MiniSidebarBtn
      tooltip="Collapsible"
      icon="mdi-minus-box"
      :disable="page.react.readOnly"
      :active="note.react.collab.collapsing.enabled"
      @click="
        () => {
          changeProp(
            !note.react.collab.collapsing.enabled,
            (selectedNote, value) => {
              selectedNote.react.collab.collapsing.enabled = value;
            },
          );

          if (internals.pages.react.tutorialStep === 2) {
            internals.pages.react.tutorialStep++;
          }
        }
      "
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 2
        "
        pos="left"
      >
        <div v-html="collapsibleTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <MiniSidebarBtn
      :tooltip="note.react.collapsing.collapsed ? 'Collapsed' : 'Expanded'"
      :icon="
        note.react.collapsing.collapsed
          ? 'mdi-chevron-up-box-outline'
          : 'mdi-chevron-down-box-outline'
      "
      :active="note.react.collapsing.collapsed"
      :disable="page.react.readOnly && !note.react.collab.collapsing.enabled"
      @click="
        changeProp(!note.react.collapsing.collapsed, (selectedNote, value) => {
          if (!page.react.readOnly) {
            selectedNote.react.collab.collapsing.enabled = true;
          }

          selectedNote.react.collapsing.collapsed = value;
        })
      "
    />

    <q-separator />

    <MiniSidebarBtn
      tooltip="Container"
      icon="mdi-page-layout-footer"
      :disable="page.react.readOnly"
      :active="note.react.collab.container.enabled"
      @click="
        () => {
          changeProp(
            !note.react.collab.container.enabled,
            (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.container.enabled = value;
              selectedNote.react.collab.container.spatial = false;
            },
          );

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
        pos="left"
      >
        <div v-html="containerTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <MiniSidebarBtn
      tooltip="Spatial container"
      icon="mdi-axis-arrow"
      :disable="page.react.readOnly"
      :active="
        note.react.collab.container.enabled &&
        note.react.collab.container.spatial
      "
      @click="
        changeProp(
          !(
            note.react.collab.container.enabled &&
            note.react.collab.container.spatial
          ),
          (selectedNote, value) => {
            selectedNote.react.collab.container.enabled = true;
            selectedNote.react.collab.container.spatial = value;
          },
        )
      "
    />

    <q-separator />

    <ColorPalette
      type="notes"
      orientation="vertical"
      :split="2"
      style="margin: 6px; width: 44px"
      :disable="page.react.readOnly"
      @select="
        changeProp($event, (selectedNote, value) => {
          if (selectedNote.react.region.type === 'note') {
            selectedNote.react.collab.color.inherit = false;
          }

          selectedNote.react.collab.color.value = value;
        })
      "
    />
  </q-list>
</template>

<script setup lang="ts">
import { splitStr } from '@stdlib/misc';
import { useIntervalFn } from '@vueuse/core';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import TutorialTooltip from 'src/components/TutorialTooltip.vue';
import type { Ref } from 'vue';

import NewPageDialog from './NewPageDialog.vue';

const page = inject<Ref<Page>>('page')!;

const note = computed(() => page.value.activeElem.react.value as PageNote);

const newPageTooltipHTML =
  'Click here to create<br/>a <b>new page</b> through<br/>this note.<br/>';
const bodyTooltipHTML = 'Click here to<br/>enable the <b>note body</b>.';
const collapsibleTooltipHTML =
  'Click here to make<br/>the note <b>collapsible</b>.';
const containerTooltipHTML =
  'Click here to enable<br/> the <b>note container</b>.<br/>This allows to place<br/>notes within eachother.';

const newPageTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const bodyTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const collapsibleTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const containerTooltip = ref<InstanceType<typeof TutorialTooltip>>();

useIntervalFn(() => {
  if (internals.pages.react.isNewUser) {
    newPageTooltip.value?.updatePosition();
    bodyTooltip.value?.updatePosition();
    collapsibleTooltip.value?.updatePosition();
    containerTooltip.value?.updatePosition();
  }
}, 1);

function changeProp(value: any, func: (note: PageNote, value: any) => void) {
  page.value.collab.doc.transact(() => {
    for (const selectedNote of page.value.selection.react.notes) {
      func(selectedNote, value);
    }
  });
}

function getInitialPageTitle() {
  let initialPageTitle = splitStr(getSelection()?.toString() ?? '', '\n')[0];

  if (initialPageTitle === '') {
    const activeElem = internals.pages.react.page.activeElem.react.value;

    if (activeElem?.type !== 'note') {
      return '';
    }

    const editorElems = activeElem.getElems('ProseMirror');

    for (const editorElem of editorElems) {
      initialPageTitle = splitStr(editorElem.innerText, '\n')[0];

      if (initialPageTitle !== '') {
        break;
      }
    }
  }

  return initialPageTitle;
}

function showNewPageDialog() {
  $quasar()
    .dialog({
      component: NewPageDialog,

      componentProps: {
        initialPageTitle: getInitialPageTitle(),
      },
    })
    .onOk((url) => {
      changeProp(url, (selectedNote, url) => {
        selectedNote.react.collab.link = url;
      });

      if (internals.pages.react.tutorialStep === 4) {
        internals.pages.react.tutorialStep++;
      }
    });
}
</script>
