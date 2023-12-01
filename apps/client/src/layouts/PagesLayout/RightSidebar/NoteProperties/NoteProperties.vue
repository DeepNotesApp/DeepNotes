<template>
  <NoteMiniProperties v-if="!uiStore().rightSidebarExpanded" />

  <div v-else>
    <!-- Link -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <LinkURL
        :model-value="note.react.collab.link"
        @update:model-value="
          (event) => {
            changeProp(event, (selectedNote, value) => {
              selectedNote.react.collab.link = value;
            });

            void createPageBacklink({
              sourcePageId: page.id,
              targetUrl: event,
            });
          }
        "
      />

      <Gap style="height: 16px" />

      <DeepBtnDropdown
        label="Create new page"
        icon="mdi-note-plus"
        class="new-page-button"
        color="primary"
        split
        :menu-offset="[0, 2]"
        :disable="page.react.readOnly"
        @click="createNewPageQuick()"
      >
        <q-list class="bg-primary">
          <q-item
            clickable
            v-close-popup
            @click="showNewPageDialog()"
          >
            <q-item-section avatar>
              <q-icon name="mdi-note-plus" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Create with options</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <template #label>
          <TutorialTooltip
            v-if="
              internals.pages.react.isNewUser &&
              internals.pages.react.tutorialStep === 4
            "
            ref="newPageTooltip"
            pos="bottom"
          >
            <div v-html="newPageTooltipHTML"></div>
          </TutorialTooltip>
        </template>
      </DeepBtnDropdown>
    </div>

    <q-separator />

    <!-- Head and body -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Head"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.head.enabled"
          title="Toggle head section"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.head.enabled = value;
            })
          "
        />

        <Gap style="width: 16px" />

        <Checkbox
          label="Body"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.body.enabled"
          title="Toggle body section"
          @update:model-value="
            (event) => {
              changeProp(event, (selectedNote, value) => {
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
            ref="bodyTooltip"
            pos="bottom"
          >
            <div v-html="bodyTooltipHTML"></div>
          </TutorialTooltip>
        </Checkbox>
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <DeepBtn
          label="Swap head and body"
          icon="mdi-cached"
          color="primary"
          :disable="page.react.readOnly"
          dense
          style="flex: 1"
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
      </div>
    </div>

    <template
      v-if="
        page.collab.store.notes[note.id]?.createdAt != null ||
        page.collab.store.notes[note.id]?.editedAt != null ||
        page.collab.store.notes[note.id]?.movedAt != null
      "
    >
      <q-separator />

      <div style="padding: 16px 20px; display: flex; flex-direction: column">
        <div v-if="page.collab.store.notes[note.id]?.createdAt != null">
          <b>Created at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].createdAt!)
            }}
          </span>
        </div>

        <div v-if="page.collab.store.notes[note.id]?.editedAt != null">
          <b>Edited at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].editedAt!)
            }}
          </span>
        </div>

        <div
          v-if="page.collab.store.notes[note.id]?.movedAt != null"
          title="The last time this note was moved between containers"
        >
          <b>Moved at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].movedAt!)
            }}
          </span>
        </div>
      </div>
    </template>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Copy link to this note"
        icon="mdi-content-copy"
        color="primary"
        @click="
          async () => {
            await setClipboardText(
              `https://deepnotes.app/pages/${page.id}?elem=${note.id}`,
            );

            $q.notify({
              message: 'Copied to clipboard.',
              type: 'positive',
            });
          }
        "
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Set as default note style"
        icon="mdi-content-save"
        color="primary"
        title="Set this note as the default note"
        @click="setAsDefault()"
        :disable="page.react.readOnly"
      />
    </div>

    <q-separator />

    <!-- Anchor -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div class="display: flex">
        <div style="flex: 1">
          <TextField
            label="X position"
            :model-value="note.react.collab.pos.x"
            @update:model-value="
              changeProp(parseFloat($event as any), (selectedNote, value) => {
                selectedNote.react.collab.pos.x = isNaN(value) ? 0 : value;
              })
            "
            dense
            :disable="page.react.readOnly"
            :maxlength="25"
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <TextField
            label="Y position"
            :model-value="note.react.collab.pos.y"
            @update:model-value="
              changeProp(parseFloat($event as any), (selectedNote, value) => {
                selectedNote.react.collab.pos.y = isNaN(value) ? 0 : value;
              })
            "
            dense
            :disable="page.react.readOnly"
            :maxlength="25"
          />
        </div>
      </div>

      <Gap style="height: 16px" />

      <div class="display: flex">
        <div style="flex: 1">
          <q-select
            label="X anchor"
            :disable="page.react.readOnly"
            :model-value="note.react.collab.anchor.x"
            @update:model-value="
              changeProp($event, (selectedNote, value) => {
                selectedNote.react.collab.pos.x +=
                  (value - selectedNote.react.collab.anchor.x) *
                  selectedNote.react.size.x;
                selectedNote.react.collab.anchor.x = value;
              })
            "
            :options="[
              { label: 'Left', value: 0 },
              { label: 'Center', value: 0.5 },
              { label: 'Right', value: 1 },
            ]"
            filled
            dense
            emit-value
            map-options
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <q-select
            label="Y anchor"
            :disable="page.react.readOnly"
            :model-value="note.react.collab.anchor.y"
            @update:model-value="
              changeProp($event, (selectedNote, value) => {
                selectedNote.react.collab.pos.y +=
                  (value - selectedNote.react.collab.anchor.y) *
                  selectedNote.react.size.y;
                selectedNote.react.collab.anchor.y = value;
              })
            "
            :options="[
              { label: 'Top', value: 0 },
              { label: 'Center', value: 0.5 },
              { label: 'Bottom', value: 1 },
            ]"
            filled
            dense
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Combobox
          label="Width"
          :disable="page.react.readOnly"
          :options="[
            { label: 'Auto', value: 'Auto' },
            ...(note.react.collapsing.collapsed
              ? [{ label: 'Minimum', value: 'Minimum' }]
              : []),
          ]"
          :model-value="note.react.collab.width[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.width[note.react.sizeProp] = value;
            })
          "
          style="flex: 1; min-width: 0"
        />

        <Gap style="width: 16px" />

        <Combobox
          label="Head height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.head.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.head.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <Combobox
          label="Body height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.body.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.body.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />

        <Gap style="width: 16px" />

        <Combobox
          label="Container height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.container.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.container.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />
      </div>
    </div>

    <q-separator />

    <div style="padding: 20px">
      <Checkbox
        label="Inherit color from parent"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.color.inherit"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.color.inherit = value;
          })
        "
      />

      <Gap style="height: 16px" />

      <div style="display: flex; justify-content: center">
        <ColorPalette
          type="notes"
          orientation="horizontal"
          :split="2"
          :disable="page.react.readOnly"
          style="width: 160px"
          @select="
            changeProp($event, (selectedNote, value) => {
              if (selectedNote.react.region.type === 'note') {
                selectedNote.react.collab.color.inherit = false;
              }

              selectedNote.react.collab.color.value = value;
            })
          "
        />
      </div>
    </div>

    <q-separator />

    <!-- Collapsing -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Collapsible"
          class="collapsible-checkbox"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.collapsing.enabled"
          @update:model-value="
            (event) => {
              changeProp(event, (selectedNote, value) => {
                selectedNote.react.collab.collapsing.enabled = value;
              });

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
            ref="collapsibleTooltip"
            pos="bottom"
          >
            <div v-html="collapsibleTooltipHTML"></div>
          </TutorialTooltip>
        </Checkbox>

        <Gap style="width: 16px" />

        <Checkbox
          label="Collapsed"
          :model-value="note.react.collab.collapsing.collapsed"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.collapsing.collapsed = value;
            })
          "
          :disable="
            page.react.readOnly || !note.react.collab.collapsing.enabled
          "
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <Checkbox
          label="Local collapsing"
          :model-value="note.react.collab.collapsing.localCollapsing"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.collapsing.localCollapsing = value;
            })
          "
          :disable="
            page.react.readOnly || !note.react.collab.collapsing.enabled
          "
        />

        <Gap style="width: 16px" />

        <Checkbox
          label="Locally collapsed"
          :model-value="note.react.collapsing.locallyCollapsed"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collapsing.locallyCollapsed = value;
            })
          "
          :disable="
            page.react.readOnly ||
            !note.react.collab.collapsing.enabled ||
            !note.react.collab.collapsing.localCollapsing
          "
        />
      </div>
    </div>

    <q-separator />

    <NoteContainerProperties />

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Movable"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.movable"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.movable = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <Checkbox
        label="Resizable"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.resizable"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.resizable = value;
          })
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Wrap head"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.head.wrap"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.head.wrap = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <Checkbox
        label="Wrap body"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.body.wrap"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.body.wrap = value;
          })
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Read-only"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.readOnly"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.readOnly = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <div style="flex: 1"></div>
    </div>

    <q-separator />

    <NoteExport />
  </div>
</template>

<script setup lang="ts">
import { splitStr } from '@stdlib/misc';
import { useIntervalFn } from '@vueuse/core';
import { pack } from 'msgpackr';
import { createPageBacklink } from 'src/code/api-interface/pages/backlinks/create';
import { createPage } from 'src/code/api-interface/pages/create';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { setClipboardText } from 'src/code/utils/clipboard';
import { handleError } from 'src/code/utils/misc';
import TutorialTooltip from 'src/components/TutorialTooltip.vue';
import type { Ref } from 'vue';

import NewPageDialog from './NewPageDialog.vue';
import NoteContainerProperties from './NoteContainerProperties.vue';
import NoteExport from './NoteExport.vue';
import NoteMiniProperties from './NoteMiniProperties.vue';

const page = inject<Ref<Page>>('page')!;

const note = computed(() => page.value.activeElem.react.value as PageNote);

const newPageTooltipHTML =
  'Click here to create<br/>a <b>new page</b> through<br/>this note.<br/>';
const bodyTooltipHTML = 'Click here to<br/>enable the <b>note body</b>.';
const collapsibleTooltipHTML =
  'Click here to make<br/>the note <b>collapsible</b>.';

const newPageTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const bodyTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const collapsibleTooltip = ref<InstanceType<typeof TutorialTooltip>>();

useIntervalFn(() => {
  if (internals.pages.react.isNewUser) {
    newPageTooltip.value?.updatePosition();
    bodyTooltip.value?.updatePosition();
    collapsibleTooltip.value?.updatePosition();
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

async function createNewPageQuick() {
  const initialPageTitle = getInitialPageTitle();

  if (initialPageTitle === '') {
    $quasar().notify({
      html: true,
      message:
        'Cannot create a page from an empty note.<br/>Please write something in it first.',
      color: 'negative',
    });
    return;
  }

  const response = await createPage({
    parentPageId: page.value.id,
    destGroupId: page.value.react.groupId,

    pageRelativeTitle: initialPageTitle,
  });

  changeProp(`/pages/${response.pageId}`, (selectedNote, url) => {
    selectedNote.react.collab.link = url;
  });

  await internals.pages.goToPage(response.pageId, { fromParent: true });

  $quasar().notify({
    message:
      'Page created successfully.' +
      (response.numFreePages != null
        ? ` (${response.numFreePages + 1}/50)`
        : ''),
    type: 'positive',
  });

  if (internals.pages.react.tutorialStep === 4) {
    internals.pages.react.tutorialStep++;
  }
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

async function setAsDefault() {
  try {
    const serialObject = internals.pages.serialization.serialize({
      notes: [internals.pages.react.page.activeElem.react.value as PageNote],
      arrows: [],
    });

    internals.pages.defaultNote = serialObject;

    await trpcClient.users.pages.setEncryptedDefaultNote.mutate(
      internals.symmetricKeyring.encrypt(pack(serialObject), {
        padding: true,
        associatedData: {
          context: 'UserDefaultNote',
          userId: authStore().userId,
        },
      }),
    );

    $quasar().notify({
      message: 'Default note updated.',
      type: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
