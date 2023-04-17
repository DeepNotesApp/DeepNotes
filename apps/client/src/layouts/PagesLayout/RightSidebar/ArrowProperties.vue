<template>
  <q-list v-if="!uiStore().rightSidebarExpanded">
    <MiniSidebarBtn
      tooltip="Backward"
      icon="mdi-arrow-left-thick"
      :active="arrow.react.collab.sourceHead === 'open'"
      :disable="page.react.readOnly"
      @click="
        changeProp(arrow.react.collab.sourceHead !== 'open', (arrow, value) => {
          arrow.react.collab.sourceHead = value ? 'open' : 'none';
        })
      "
    />

    <MiniSidebarBtn
      tooltip="Swap"
      icon="mdi-cached"
      :disable="page.react.readOnly"
      @click="swapArrowheads"
    />

    <MiniSidebarBtn
      tooltip="Forward"
      icon="mdi-arrow-right-thick"
      :active="arrow.react.collab.targetHead === 'open'"
      :disable="page.react.readOnly"
      @click="
        changeProp(arrow.react.collab.targetHead !== 'open', (arrow, value) => {
          arrow.react.collab.targetHead = value ? 'open' : 'none';
        })
      "
    />

    <q-separator />

    <MiniSidebarBtn
      tooltip="Dashed"
      icon="mdi-dots-horizontal"
      :active="arrow.react.collab.bodyStyle === 'dashed'"
      :disable="page.react.readOnly"
      @click="
        changeProp(
          arrow.react.collab.bodyStyle !== 'dashed',
          (arrow, value) => {
            arrow.react.collab.bodyStyle = value ? 'dashed' : 'solid';
          },
        )
      "
    />

    <q-separator />

    <ColorPalette
      type="arrows"
      orientation="vertical"
      :split="2"
      style="margin: 6px; width: 44px"
      :disable="page.react.readOnly"
      @select="
        changeProp($event, (arrow, value) => {
          arrow.react.collab.color = value;
        })
      "
    />
  </q-list>

  <div v-else>
    <div style="padding: 20px; display: flex; flex-direction: column">
      <div class="display: flex">
        <div style="flex: 1">
          <q-select
            label="Source anchor"
            :disable="page.react.readOnly"
            :model-value="JSON.stringify(arrow.react.collab.sourceAnchor)"
            :options="[
              { label: 'Auto', value: 'null' },
              { label: 'Left', value: JSON.stringify({ x: -1, y: 0 }) },
              { label: 'Top', value: JSON.stringify({ x: 0, y: -1 }) },
              { label: 'Right', value: JSON.stringify({ x: 1, y: 0 }) },
              { label: 'Bottom', value: JSON.stringify({ x: 0, y: 1 }) },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.sourceAnchor = JSON.parse(value);
              })
            "
            filled
            dense
            emit-value
            map-options
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <q-select
            label="Target anchor"
            :disable="page.react.readOnly"
            :model-value="JSON.stringify(arrow.react.collab.targetAnchor)"
            :options="[
              { label: 'Auto', value: 'null' },
              { label: 'Left', value: JSON.stringify({ x: -1, y: 0 }) },
              { label: 'Top', value: JSON.stringify({ x: 0, y: -1 }) },
              { label: 'Right', value: JSON.stringify({ x: 1, y: 0 }) },
              { label: 'Bottom', value: JSON.stringify({ x: 0, y: 1 }) },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.targetAnchor = JSON.parse(value);
              })
            "
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
      <div class="display: flex">
        <div style="flex: 1">
          <q-select
            label="Source head"
            :disable="page.react.readOnly"
            :model-value="arrow.react.collab.sourceHead"
            :options="[
              { label: 'None', value: 'none' },
              { label: 'Open', value: 'open' },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.sourceHead = value;
              })
            "
            filled
            dense
            emit-value
            map-options
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <q-select
            label="Target head"
            :disable="page.react.readOnly"
            :model-value="arrow.react.collab.targetHead"
            :options="[
              { label: 'None', value: 'none' },
              { label: 'Open', value: 'open' },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.targetHead = value;
              })
            "
            filled
            dense
            emit-value
            map-options
          />
        </div>
      </div>

      <Gap style="height: 16px" />

      <DeepBtn
        label="Swap arrowheads"
        color="primary"
        @click="swapArrowheads"
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div class="display: flex">
        <div style="flex: 1">
          <q-select
            label="Body type"
            :disable="page.react.readOnly"
            :model-value="arrow.react.collab.bodyType"
            :options="[
              { label: 'Curve', value: 'curve' },
              { label: 'Line', value: 'line' },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.bodyType = value;
              })
            "
            filled
            dense
            emit-value
            map-options
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <q-select
            label="Body style"
            :disable="page.react.readOnly"
            :model-value="arrow.react.collab.bodyStyle"
            :options="[
              { label: 'Solid', value: 'solid' },
              { label: 'Dashed', value: 'dashed' },
            ]"
            @update:model-value="
              changeProp($event, (selectedArrow, value) => {
                selectedArrow.react.collab.bodyStyle = value;
              })
            "
            filled
            dense
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <q-separator />

    <div style="padding: 20px">
      <div style="display: flex; justify-content: center">
        <ColorPalette
          type="arrows"
          orientation="horizontal"
          :split="2"
          :disable="page.react.readOnly"
          style="width: 160px"
          @select="
            changeProp($event, (arrow, value) => {
              arrow.react.collab.color = value;
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
        :disable="page.react.readOnly"
        @click="setAsDefault()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { pack } from 'msgpackr';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow';
import type { Page } from 'src/code/pages/page/page';
import type { ISerialArrowInput } from 'src/code/pages/serialization';
import { ISerialArrow } from 'src/code/pages/serialization';
import { handleError } from 'src/code/utils/misc.js';
import type { Ref } from 'vue';
import { yXmlFragmentToProsemirrorJSON } from 'y-prosemirror';

const page = inject<Ref<Page>>('page')!;

const arrow = computed(() => page.value.activeElem.react.value as PageArrow);

function changeProp(value: any, func: (arrow: PageArrow, value: any) => void) {
  page.value.collab.doc.transact(() => {
    for (const arrow of page.value.selection.react.arrows) {
      func(arrow, value);
    }
  });
}

async function setAsDefault() {
  try {
    const serialArrow = ISerialArrow().parse({
      ...arrow.value.react.collab,

      source: 0,
      target: 0,

      label: yXmlFragmentToProsemirrorJSON(arrow.value.react.collab.label),
    } as ISerialArrowInput);

    internals.pages.defaultArrow = serialArrow;

    await trpcClient.users.pages.setEncryptedDefaultArrow.mutate(
      internals.symmetricKeyring.encrypt(pack(serialArrow), {
        padding: true,
        associatedData: {
          context: 'UserDefaultArrow',
          userId: authStore().userId,
        },
      }),
    );

    $quasar().notify({
      message: 'Default arrow updated.',
      type: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

function swapArrowheads() {
  changeProp(null, (selectedArrow) => {
    const sourceHead = selectedArrow.react.collab.sourceHead;

    selectedArrow.react.collab.sourceHead =
      selectedArrow.react.collab.targetHead;

    selectedArrow.react.collab.targetHead = sourceHead;
  });
}
</script>
