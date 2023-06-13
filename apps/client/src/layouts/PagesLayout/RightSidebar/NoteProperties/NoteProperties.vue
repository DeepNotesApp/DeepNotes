<template>
  <q-list v-if="!uiStore().rightSidebarExpanded">
    <MiniSidebarBtn
      tooltip="Create new page"
      icon="mdi-note-plus"
      :disable="page.react.readOnly"
      @click="createNewPage"
    />

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
        changeProp(!note.react.collab.body.enabled, (selectedNote, value) => {
          selectedNote.react.collab.head.enabled ||=
            selectedNote.react.numEnabledSections === 1 && !value;
          selectedNote.react.collab.body.enabled = value;
        })
      "
    />

    <q-separator />

    <MiniSidebarBtn
      tooltip="Collapsible"
      icon="mdi-minus-box"
      :disable="page.react.readOnly"
      :active="note.react.collab.collapsing.enabled"
      @click="
        changeProp(
          !note.react.collab.collapsing.enabled,
          (selectedNote, value) => {
            selectedNote.react.collab.collapsing.enabled = value;
          },
        )
      "
    />

    <MiniSidebarBtn
      :tooltip="note.react.collapsing.collapsed ? 'Expand' : 'Collapse'"
      :icon="
        note.react.collapsing.collapsed
          ? 'mdi-chevron-down-box-outline'
          : 'mdi-chevron-up-box-outline'
      "
      :active="note.react.collapsing.collapsed"
      :disable="page.react.readOnly || !note.react.collab.collapsing.enabled"
      @click="
        changeProp(!note.react.collapsing.collapsed, (selectedNote, value) => {
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
        changeProp(
          !note.react.collab.container.enabled,
          (selectedNote, value) => {
            selectedNote.react.collab.body.enabled ||=
              selectedNote.react.numEnabledSections === 1 && !value;
            selectedNote.react.collab.container.enabled = value;
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

      <DeepBtn
        label="Create new page"
        color="primary"
        :disable="page.react.readOnly"
        @click="createNewPage"
      />
    </div>

    <q-separator />

    <!-- Head and body -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Head"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.head.enabled"
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
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.head.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.body.enabled = value;
            })
          "
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <DeepBtn
          label="Swap"
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

        <Gap style="width: 16px" />

        <DeepBtn
          label="Float"
          color="primary"
          :disable="page.react.readOnly"
          dense
          style="flex: 1"
          @click="
            changeProp(note, (note) => {
              if (
                note.react.collab.head.value.toDOM().textContent!.length === 0
              ) {
                internals
                  .tiptap()
                  .swapXmlFragments(
                    note.react.collab.head.value,
                    note.react.collab.body.value,
                  );
              }
            })
          "
        />
      </div>
    </div>

    <q-separator />

    <!-- Default -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Set as default"
        color="primary"
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
          :disable="page.react.readOnly"
          :model-value="note.react.collab.collapsing.enabled"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.collapsing.enabled = value;
            })
          "
        />

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

    <!-- Container -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Container"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.container.enabled"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.container.enabled = value;
            })
          "
        />

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

      <Gap style="height: 24px" />

      <DeepBtn
        label="Reverse children"
        :disable="page.react.readOnly || !note.react.collab.container.enabled"
        color="primary"
        @click="
          changeProp($event, (selectedNote, value) => {
            selectedNote.reverseChildren();
          })
        "
      />
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { splitStr } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { createPageBacklink } from 'src/code/api-interface/pages/backlinks/create';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

import NewPageDialog from './NewPageDialog.vue';

const page = inject<Ref<Page>>('page')!;

const note = computed(() => page.value.activeElem.react.value as PageNote);

function changeProp(value: any, func: (note: PageNote, value: any) => void) {
  page.value.collab.doc.transact(() => {
    for (const selectedNote of page.value.selection.react.notes) {
      func(selectedNote, value);
    }
  });
}

function createNewPage() {
  let initialPageTitle = splitStr(getSelection()?.toString() ?? '', '\n')[0];

  if (initialPageTitle === '') {
    const activeElem = internals.pages.react.page.activeElem.react.value;

    if (activeElem?.type !== 'note') {
      return;
    }

    const editorElem = activeElem.getElem('ProseMirror');

    if (editorElem != null) {
      initialPageTitle = splitStr(editorElem.innerText, '\n')[0];
    }
  }

  $quasar()
    .dialog({
      component: NewPageDialog,

      componentProps: {
        initialPageTitle,
      },
    })
    .onOk((url) => {
      changeProp(url, (selectedNote, url) => {
        selectedNote.react.collab.link = url;
      });
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
