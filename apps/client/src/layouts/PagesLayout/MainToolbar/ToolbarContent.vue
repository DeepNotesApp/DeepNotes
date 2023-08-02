<template>
  <div
    ref="toolbarRef"
    style="flex: 1; width: 0; display: flex; align-items: center"
  >
    <template
      v-for="(numSubgroups, groupIndex) in toolbarStructure"
      :key="groupIndex"
    >
      <q-separator
        v-if="groupIndex > 0"
        vertical
      />

      <template
        v-for="subgroupIndex in numSubgroups"
        :key="subgroupIndex"
      >
        <q-separator
          v-if="subgroupIndex > 1"
          vertical
        />

        <template
          v-for="(button, buttonIndex) in toolbarGroups[groupIndex].subgroups[
            subgroupIndex - 1
          ]"
          :key="buttonIndex"
        >
          <ToolbarBtn
            v-bind="button"
            :disable="button.disable?.(page)"
            @click="button.click?.(page)"
          />
        </template>
      </template>

      <template
        v-if="numSubgroups < toolbarGroups[groupIndex].subgroups.length"
      >
        <q-separator
          v-if="numSubgroups > 0"
          vertical
        />

        <ToolbarBtn
          v-bind="toolbarGroups[groupIndex]"
          icon-size="24px"
        >
          <q-menu
            style="padding: 0px 4px"
            :offset="[0, 4]"
            auto-close
          >
            <template
              v-for="subgroupIndex in toolbarGroups[groupIndex].subgroups
                .length - numSubgroups"
              :key="subgroupIndex"
            >
              <q-separator
                v-if="subgroupIndex > 1"
                vertical
                class="popup"
              />

              <template
                v-for="(button, buttonIndex) in toolbarGroups[groupIndex]
                  .subgroups[numSubgroups + subgroupIndex - 1]"
                :key="buttonIndex"
              >
                <ToolbarBtn
                  v-bind="button"
                  :disable="button.disable?.(page)"
                  @click="button.click?.(page)"
                />
              </template>
            </template>
          </q-menu>
        </ToolbarBtn>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import { unsetNode } from 'src/code/tiptap/utils';
import {
  getAltKeyName,
  getCtrlKeyName,
  useResizeObserver,
} from 'src/code/utils/misc';

import InsertImageDialog from './InsertImageDialog.vue';
import InsertLinkDialog from './InsertLinkDialog.vue';

type ToolbarButton = {
  tooltip: string;
  icon: string;
  iconSize?: string;
  style?: Record<string, string>;
  disable?: (page: Page) => boolean;
  click: (page: Page) => void;
};
type ToolbarButtonSubgroup = ToolbarButton[];

type ToolbarButtonGroup = {
  tooltip: string;
  icon: string;
  subgroups: ToolbarButtonSubgroup[];
};

const toolbarGroups: ToolbarButtonGroup[] = [
  {
    tooltip: 'Basic',
    icon: 'mdi-hammer-wrench',
    subgroups: [
      [
        {
          tooltip: `Cut\n(${getCtrlKeyName()} + X)`,
          icon: 'mdi-content-cut',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.cut(),
        },
        {
          tooltip: `Copy\n(${getCtrlKeyName()} + C)`,
          icon: 'mdi-content-copy',
          disable: (page: Page) => !page.activeElem.react.exists,
          click: (page: Page) => page.selection.copy(),
        },
        {
          tooltip: `Paste\n(${getCtrlKeyName()} + V)`,
          icon: 'mdi-content-paste',
          disable: (page: Page) => page.react.readOnly,
          click: (page: Page) => page.selection.paste(),
        },
        {
          tooltip: `Duplicate\n(${getCtrlKeyName()} + D)`,
          icon: 'mdi-content-duplicate',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.cloning.perform(),
        },
      ],
      [
        {
          tooltip: `Select all\n(${getCtrlKeyName()} + A)`,
          icon: 'mdi-select-all',
          iconSize: '24px',
          click: (page: Page) => page.selection.selectAll(),
        },
        {
          tooltip: 'Delete\n(Del)',
          icon: 'mdi-delete-outline',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.deleting.perform(),
        },
      ],
    ],
  },
  {
    tooltip: 'Formatting',
    icon: 'mdi-format-color-text',
    subgroups: [
      [
        {
          tooltip: `Bold\n(${getCtrlKeyName()} + B)`,
          icon: 'mdi-format-bold',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('bold'),
        },
        {
          tooltip: `Italic\n(${getCtrlKeyName()} + I)`,
          icon: 'mdi-format-italic',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('italic'),
        },
        {
          tooltip: `Strikethrough\n(${getCtrlKeyName()} + Shift + X)`,
          icon: 'mdi-format-strikethrough',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('strike'),
        },
        {
          tooltip: `Underline\n(${getCtrlKeyName()} + U)`,
          icon: 'mdi-format-underline',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('underline'),
        },
        {
          tooltip: `Clear formatting\n(${getCtrlKeyName()} + Space)`,
          icon: 'mdi-format-clear',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) =>
              chain.clearNodes().unsetAllMarks(),
            ),
        },
      ],
      [
        {
          tooltip: `Align left\n(${getCtrlKeyName()} + Shift + L)`,
          icon: 'mdi-format-align-left',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.setTextAlign('left')),
        },
        {
          tooltip: `Align center\n(${getCtrlKeyName()} + Shift + E)`,
          icon: 'mdi-format-align-center',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.setTextAlign('center')),
        },
        {
          tooltip: `Align right\n(${getCtrlKeyName()} + Shift + R)`,
          icon: 'mdi-format-align-right',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.setTextAlign('right')),
        },
        {
          tooltip: `Justify\n(${getCtrlKeyName()} + Shift + J)`,
          icon: 'mdi-format-align-justify',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.setTextAlign('justify')),
        },
        {
          tooltip: `Highlight\n(${getCtrlKeyName()} + Shift + H)`,
          icon: 'mdi-marker',
          iconSize: '20px',
          style: { 'padding-top': '1px' },
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleHighlight()),
        },
      ],
      [
        {
          tooltip: `Subscript\n(${getCtrlKeyName()} + ,)`,
          icon: 'mdi-format-subscript',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('subscript'),
        },
        {
          tooltip: `Superscript\n(${getCtrlKeyName()} + .)`,
          icon: 'mdi-format-superscript',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('superscript'),
        },
        {
          tooltip: `Insert link\n(${getCtrlKeyName()} + K)`,
          icon: 'mdi-link',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (_page: Page) =>
            $quasar().dialog({ component: InsertLinkDialog }),
        },
        {
          tooltip: `Remove link\n(${getCtrlKeyName()} + Shift + K)`,
          icon: 'mdi-link-off',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.unsetMark('link')),
        },
        {
          tooltip: `Code\n(${getCtrlKeyName()} + E)`,
          icon: 'mdi-code-tags',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.selection.toggleMark('code'),
        },
      ],
      [
        {
          tooltip: `Heading 1\n(${getAltKeyName()} + 1)`,
          icon: 'mdi-format-header-1',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.toggleNode('heading', { level: 1 }),
        },
        {
          tooltip: `Heading 2\n(${getAltKeyName()} + 2)`,
          icon: 'mdi-format-header-2',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.toggleNode('heading', { level: 2 }),
        },
        {
          tooltip: `Heading 3\n(${getAltKeyName()} + 3)`,
          icon: 'mdi-format-header-3',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.toggleNode('heading', { level: 3 }),
        },
        {
          tooltip: 'Remove heading',
          icon: 'mdi-format-header-pound',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain, editor) =>
              unsetNode(editor, chain, 'heading'),
            ),
        },
      ],
    ],
  },
  {
    tooltip: 'Objects',
    icon: 'mdi-format-list-numbered',
    subgroups: [
      [
        {
          tooltip: `Ordered list\n(${getCtrlKeyName()} + Shift + 7)`,
          icon: 'mdi-format-list-numbered',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleOrderedList()),
        },
        {
          tooltip: `Bullet list\n(${getCtrlKeyName()} + Shift + 8)`,
          icon: 'mdi-format-list-bulleted',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleBulletList()),
        },
        {
          tooltip: `Checklist\n(${getCtrlKeyName()} + Shift + 9)`,
          icon: 'mdi-checkbox-marked-outline',
          iconSize: '22px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleTaskList()),
        },
        {
          tooltip: 'Inline math',
          icon: 'mdi-sigma-lower',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addInlineMath()),
        },
        {
          tooltip: 'Math block',
          icon: 'mdi-sigma',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addMathBlock()),
        },
      ],
      [
        {
          tooltip: `Blockquote\n(${getCtrlKeyName()} + Shift + B)`,
          icon: 'mdi-format-quote-close',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleBlockquote()),
        },
        {
          tooltip: `Codeblock\n(${getCtrlKeyName()} + ${getAltKeyName()} + C)`,
          icon: 'mdi-code-braces',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) =>
            page.selection.format((chain) => chain.toggleCodeBlock()),
        },
        {
          tooltip: 'Rule',
          icon: 'mdi-minus',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.setHorizontalRule()),
        },
        {
          tooltip: 'Image',
          icon: 'mdi-image',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (_page: Page) =>
            $quasar().dialog({ component: InsertImageDialog }),
        },
        {
          tooltip: 'YouTube video',
          icon: 'mdi-youtube',
          iconSize: '24px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            $quasar()
              .dialog({
                title: 'Insert YouTube video',
                message: 'Enter the video URL:',

                prompt: {
                  type: 'url',
                  model: '',
                  filled: true,
                },
                color: 'primary',

                cancel: { flat: true, color: 'negative' },

                focus: 'cancel',
              })
              .onOk((url: string) =>
                page.selection.format((chain) =>
                  chain.setYoutubeVideo({
                    src: url,
                  }),
                ),
              ),
        },
      ],
      [
        {
          tooltip: 'Insert table',
          icon: 'mdi-table-large-plus',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) =>
              chain.insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: false,
              }),
            ),
        },
        {
          tooltip: 'Remove table',
          icon: 'mdi-table-large-remove',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.deleteTable()),
        },
        {
          tooltip: 'Insert column before',
          icon: 'mdi-table-column-plus-before',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addColumnBefore()),
        },
        {
          tooltip: 'Insert column after',
          icon: 'mdi-table-column-plus-after',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addColumnAfter()),
        },
        {
          tooltip: 'Remove column',
          icon: 'mdi-table-column-remove',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.deleteColumn()),
        },
      ],
      [
        {
          tooltip: 'Merge cells',
          icon: 'mdi-table-merge-cells',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.mergeCells()),
        },
        {
          tooltip: 'Split cell',
          icon: 'mdi-table-split-cell',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.splitCell()),
        },
        {
          tooltip: 'Insert row before',
          icon: 'mdi-table-row-plus-before',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addRowBefore()),
        },
        {
          tooltip: 'Insert row after',
          icon: 'mdi-table-row-plus-after',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.addRowAfter()),
        },
        {
          tooltip: 'Remove row',
          icon: 'mdi-table-row-remove',
          iconSize: '23px',
          disable: (page: Page) =>
            page.react.readOnly || !page.editing.react.active,
          click: (page: Page) =>
            page.selection.format((chain) => chain.deleteRow()),
        },
      ],
    ],
  },
  {
    tooltip: 'Alignment',
    icon: 'mdi-align-horizontal-left',
    subgroups: [
      [
        {
          tooltip: 'Align left',
          icon: 'mdi-format-align-left',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.aligning.alignLeft(),
        },
        {
          tooltip: 'Align center',
          icon: 'mdi-format-align-center',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.aligning.alignCenterHorizontal(),
        },
        {
          tooltip: 'Align right',
          icon: 'mdi-format-align-right',
          iconSize: '21px',
          disable: (page: Page) =>
            page.react.readOnly || !page.activeElem.react.exists,
          click: (page: Page) => page.aligning.alignRight(),
        },
      ],
      [
        {
          tooltip: 'Align top',
          icon: 'mdi-align-vertical-top',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || page.selection.react.notes.length < 2,
          click: (page: Page) => page.aligning.alignTop(),
        },
        {
          tooltip: 'Center vertically',
          icon: 'mdi-align-vertical-center',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || page.selection.react.notes.length < 2,
          click: (page: Page) => page.aligning.alignCenterVertical(),
        },
        {
          tooltip: 'Align bottom',
          icon: 'mdi-align-vertical-bottom',
          iconSize: '25px',
          disable: (page: Page) =>
            page.react.readOnly || page.selection.react.notes.length < 2,
          click: (page: Page) => page.aligning.alignBottom(),
        },
      ],
    ],
  },
];

const page = computed(() => internals.pages.react.page);

const toolbarRef = ref<HTMLElement>();
const toolbarWidth = ref(0);

useResizeObserver(
  () => toolbarRef.value!,
  (entry) => {
    toolbarWidth.value = entry.contentRect.width;
  },
);

const buttonWidth = 28;
const dividerWidth = 15;

type ToolbarStructure = number[];

function calculateToolbarWidth(structure: ToolbarStructure): number {
  let width = 0;

  for (let groupIndex = 0; groupIndex < structure.length; ++groupIndex) {
    if (groupIndex > 0) {
      width += dividerWidth;
    }

    for (
      let subgroupIndex = 0;
      subgroupIndex < structure[groupIndex];
      ++subgroupIndex
    ) {
      if (subgroupIndex > 0) {
        width += dividerWidth;
      }

      width +=
        toolbarGroups[groupIndex].subgroups[subgroupIndex].length * buttonWidth;
    }

    if (structure[groupIndex] < toolbarGroups[groupIndex].subgroups.length) {
      if (structure[groupIndex] > 0) {
        width += dividerWidth;
      }

      width += buttonWidth;
    }
  }

  return width;
}

const toolbarStructure = computed(() => {
  const structure = toolbarGroups.map(() => 0);

  for (let i = 0; i < structure.length; ++i) {
    for (let j = 1; j <= toolbarGroups[i].subgroups.length; ++j) {
      structure[i] = j;

      if (calculateToolbarWidth(structure) > toolbarWidth.value) {
        structure[i] = j - 1;

        return structure;
      }
    }
  }

  return structure;
});
</script>

<style scoped lang="scss">
.q-separator {
  margin: 6px 7px;
}
.q-separator.popup {
  margin: 0;
}
</style>
