<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Link,
  Code,
  Quote,
  Minus,
  Table,
  Image,
  Video,
  Undo,
  Redo,
  Plus,
  ArrowRight,
  Highlighter,
  Subscript,
  Superscript,
  Sigma,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "@lucide/vue";
import { useEditorCommandDispatcher } from "./useEditorCommandDispatcher";

const props = defineProps<{
  selectedNoteIds: string[];
  canUndo: boolean;
  canRedo: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  "insert-note": [];
  "insert-arrow": [];
}>();

const dispatcher = useEditorCommandDispatcher(() => props.selectedNoteIds);

const hasSelection = computed(() => props.selectedNoteIds.length > 0);

function run(cmd: (ed: any) => void) {
  dispatcher.run(cmd);
}

function promptImage() {
  const url = globalThis.prompt("Image URL");
  if (url) {
    run((ed) => ed.chain().focus().setImage({ src: url }).run());
  }
}

function promptVideo() {
  const url = globalThis.prompt("YouTube URL");
  if (url) {
    run((ed) => ed.chain().focus().setYoutubeVideo({ src: url }).run());
  }
}
</script>

<template>
  <div
    class="border-border/40 bg-background/95 pointer-events-auto flex items-center gap-1 rounded-md border px-2 py-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60"
  >
    <!-- Undo / Redo -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Undo"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        <Undo class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Redo"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        <Redo class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Insert -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Insert note"
        @click="emit('insert-note')"
      >
        <Plus class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Insert arrow between selected notes"
        @click="emit('insert-arrow')"
      >
        <ArrowRight class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Formatting -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Bold (Ctrl+B)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleBold().run())"
      >
        <Bold class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Italic (Ctrl+I)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleItalic().run())"
      >
        <Italic class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Underline (Ctrl+U)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleUnderline().run())"
      >
        <Underline class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Strikethrough (Ctrl+Shift+X)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleStrike().run())"
      >
        <Strikethrough class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Highlight (Ctrl+Shift+H)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleHighlight().run())"
      >
        <Highlighter class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Headings -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Heading 1 (Alt+1)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleHeading({ level: 1 }).run())"
      >
        <Heading1 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Heading 2 (Alt+2)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleHeading({ level: 2 }).run())"
      >
        <Heading2 class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Heading 3 (Alt+3)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleHeading({ level: 3 }).run())"
      >
        <Heading3 class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Lists -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Bullet list (Ctrl+Shift+8)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleBulletList().run())"
      >
        <List class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Ordered list (Ctrl+Shift+7)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleOrderedList().run())"
      >
        <ListOrdered class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Task list (Ctrl+Shift+9)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleTaskList().run())"
      >
        <ListTodo class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Objects -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Blockquote (Alt+Shift+Q)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleBlockquote().run())"
      >
        <Quote class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Code block (Alt+Shift+C)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().toggleCodeBlock().run())"
      >
        <Code class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Horizontal rule (Alt+Shift+R)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().setHorizontalRule().run())"
      >
        <Minus class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Table (Alt+Shift+T)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())"
      >
        <Table class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Image (Alt+Shift+I)"
        :disabled="!hasSelection"
        @click="promptImage"
      >
        <Image class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="YouTube video (Alt+Shift+Y)"
        :disabled="!hasSelection"
        @click="promptVideo"
      >
        <Video class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Inline math (Ctrl+M)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().insertInlineMath().run())"
      >
        <Sigma class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="bg-border mx-1 h-4 w-px" />

    <!-- Alignment -->
    <div class="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Align left (Ctrl+Shift+L)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().setTextAlign('left').run())"
      >
        <AlignLeft class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Align center (Ctrl+Shift+C)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().setTextAlign('center').run())"
      >
        <AlignCenter class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7"
        title="Align right (Ctrl+Shift+R)"
        :disabled="!hasSelection"
        @click="run((ed) => ed.chain().focus().setTextAlign('right').run())"
      >
        <AlignRight class="h-3.5 w-3.5" />
      </Button>
    </div>

  </div>
</template>
