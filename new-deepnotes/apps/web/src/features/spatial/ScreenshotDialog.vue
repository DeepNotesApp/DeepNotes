<script setup lang="ts">
import { ref, computed } from "vue";
import { Camera, X } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import html2canvas from "html2canvas";
import type { NoteModel } from "./note-model";

const props = defineProps<{
  open: boolean;
  canvasElement: HTMLElement | null;
  selectedNoteIds: string[];
  notes: { id: string; model: NoteModel }[];
  zoom: number;
  camX: number;
  camY: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const margin = ref(100);
const scale = ref(100);

function handleClose() {
  emit("close");
}

const selectedNotes = computed(() =>
  props.notes.filter((n) => props.selectedNoteIds.includes(n.id)),
);

function getNoteBounds() {
  if (selectedNotes.value.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const note of selectedNotes.value) {
    const x = note.model.pos.value.x;
    const y = note.model.pos.value.y;

    let w = 200;
    const wStr = note.model.width.value.expanded;
    if (wStr !== "Auto" && wStr.endsWith("px")) {
      w = parseInt(wStr, 10);
    }

    let h = 80;
    if (note.model.head.enabled.value) {
      const hStr = note.model.head.height.value.expanded;
      if (hStr !== "Auto" && hStr.endsWith("px")) {
        h = parseInt(hStr, 10);
      } else {
        h = 40;
      }
    }
    if (note.model.body.enabled.value) {
      const bStr = note.model.body.height.value.expanded;
      if (bStr !== "Auto" && bStr.endsWith("px")) {
        h += parseInt(bStr, 10);
      } else {
        h += 40;
      }
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return { minX, minY, maxX, maxY };
}

async function takeScreenshot() {
  if (!props.canvasElement) return;

  const bounds = getNoteBounds();
  const rect = props.canvasElement.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let worldMinX: number;
  let worldMinY: number;
  let worldMaxX: number;
  let worldMaxY: number;

  if (bounds) {
    worldMinX = bounds.minX;
    worldMinY = bounds.minY;
    worldMaxX = bounds.maxX;
    worldMaxY = bounds.maxY;
  } else {
    // Capture visible viewport in world coordinates
    worldMinX = props.camX - rect.width / 2 / props.zoom;
    worldMinY = props.camY - rect.height / 2 / props.zoom;
    worldMaxX = props.camX + rect.width / 2 / props.zoom;
    worldMaxY = props.camY + rect.height / 2 / props.zoom;
  }

  const m = margin.value;
  const z = props.zoom;

  // Convert world bounds to screen coordinates relative to canvas element
  const screenMinX = (worldMinX - props.camX) * z + cx - rect.left;
  const screenMinY = (worldMinY - props.camY) * z + cy - rect.top;
  const screenMaxX = (worldMaxX - props.camX) * z + cx - rect.left;
  const screenMaxY = (worldMaxY - props.camY) * z + cy - rect.top;

  const captureX = screenMinX - m * z;
  const captureY = screenMinY - m * z;
  const captureWidth = screenMaxX - screenMinX + m * z * 2;
  const captureHeight = screenMaxY - screenMinY + m * z * 2;

  const canvas = await html2canvas(props.canvasElement, {
    scale: (1 / z) * (scale.value / 100),
    x: captureX,
    y: captureY,
    width: Math.round(captureWidth),
    height: Math.round(captureHeight),
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });

  const dataUrl = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = "DeepNotes-screenshot.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  handleClose();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="handleClose"
    >
      <Card class="w-full max-w-sm">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Take Screenshot</CardTitle>
          <Button variant="ghost" size="icon" @click="handleClose">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Margin (px)</Label>
            <input
              v-model.number="margin"
              type="number"
              min="0"
              data-testid="screenshot-margin"
              class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors focus-visible:ring-3 md:text-sm min-w-0 outline-none"
            />
          </div>

          <div class="space-y-2">
            <Label>Scale (%)</Label>
            <input
              v-model.number="scale"
              type="number"
              min="10"
              max="500"
              data-testid="screenshot-scale"
              class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors focus-visible:ring-3 md:text-sm min-w-0 outline-none"
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="handleClose">Cancel</Button>
            <Button @click="takeScreenshot">
              <Camera class="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </Teleport>
</template>
