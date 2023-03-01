<template>
  <q-menu
    :target="false"
    v-model="internals.pages.react.tableContextMenu"
    style="visibility: visible"
    :style="{
      left: `${internals.pages.react.tableContextMenuPos.x}px`,
      top: `${internals.pages.react.tableContextMenuPos.y}px`,
    }"
  >
    <q-list>
      <q-menu-hover #default="{ activatorAttr, menuAttr }">
        <q-item
          v-bind="activatorAttr"
          clickable
        >
          <q-item-section avatar>
            <q-icon name="mdi-table-column" />
          </q-item-section>
          <q-item-section>Column</q-item-section>
          <q-item-section side>
            <q-icon name="mdi-chevron-right" />
          </q-item-section>

          <q-menu
            v-bind="menuAttr"
            anchor="top end"
            self="top start"
            auto-close
          >
            <q-list>
              <q-item
                clickable
                @click="format((chain) => chain.addColumnBefore())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-column-plus-before" />
                </q-item-section>
                <q-item-section>Insert column before</q-item-section>
              </q-item>

              <q-item
                clickable
                @click="format((chain) => chain.addColumnAfter())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-column-plus-after" />
                </q-item-section>
                <q-item-section>Insert column after</q-item-section>
              </q-item>

              <q-item
                clickable
                @click="format((chain) => chain.deleteColumn())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-column-remove" />
                </q-item-section>
                <q-item-section>Remove column</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item>
      </q-menu-hover>

      <q-menu-hover #default="{ activatorAttr, menuAttr }">
        <q-item
          v-bind="activatorAttr"
          clickable
        >
          <q-item-section avatar>
            <q-icon name="mdi-table-row" />
          </q-item-section>
          <q-item-section>Row</q-item-section>
          <q-item-section side>
            <q-icon name="mdi-chevron-right" />
          </q-item-section>

          <q-menu
            v-bind="menuAttr"
            anchor="top end"
            self="top start"
            auto-close
          >
            <q-list>
              <q-item
                clickable
                @click="format((chain) => chain.addRowBefore())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-row-plus-before" />
                </q-item-section>
                <q-item-section>Insert row before</q-item-section>
              </q-item>

              <q-item
                clickable
                @click="format((chain) => chain.addRowAfter())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-row-plus-after" />
                </q-item-section>
                <q-item-section>Insert row after</q-item-section>
              </q-item>

              <q-item
                clickable
                @click="format((chain) => chain.deleteRow())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-row-remove" />
                </q-item-section>
                <q-item-section>Remove row</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item>
      </q-menu-hover>

      <q-menu-hover #default="{ activatorAttr, menuAttr }">
        <q-item
          v-bind="activatorAttr"
          clickable
        >
          <q-item-section avatar>
            <q-icon name="mdi-table-merge-cells" />
          </q-item-section>
          <q-item-section>Cells</q-item-section>
          <q-item-section side>
            <q-icon name="mdi-chevron-right" />
          </q-item-section>

          <q-menu
            v-bind="menuAttr"
            anchor="top end"
            self="top start"
            auto-close
          >
            <q-list>
              <q-item
                clickable
                @click="format((chain) => chain.mergeCells())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-merge-cells" />
                </q-item-section>
                <q-item-section>Merge cells</q-item-section>
              </q-item>

              <q-item
                clickable
                @click="format((chain) => chain.splitCell())"
              >
                <q-item-section avatar>
                  <q-icon name="mdi-table-split-cell" />
                </q-item-section>
                <q-item-section>Split cell</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item>
      </q-menu-hover>

      <q-item
        clickable
        v-close-popup
        @click="format((chain) => chain.deleteTable())"
      >
        <q-item-section avatar>
          <q-icon name="mdi-table-large-remove" />
        </q-item-section>
        <q-item-section>Remove table</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import type { ChainedCommands } from '@tiptap/vue-3';

const page = computed(() => internals.pages.react.page);

function format(func: (chain: ChainedCommands) => ChainedCommands) {
  func(page.value.editing.react.editor!.chain().focus()).run();
}
</script>
