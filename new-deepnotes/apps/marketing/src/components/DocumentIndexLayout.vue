<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { marked } from "marked";

const props = defineProps<{
  title: string;
  markdownSource: string;
}>();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const html = computed(() => {
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  return marked.parse(props.markdownSource, { renderer });
});

interface Heading {
  level: number;
  text: string;
  id: string;
}

const headings = computed(() => {
  const result: Heading[] = [];
  const tokens = marked.lexer(props.markdownSource);
  for (const token of tokens) {
    if (token.type === "heading") {
      result.push({ level: token.depth, text: token.text, id: slugify(token.text) });
    }
  }
  return result;
});

const activeHeading = ref("");
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const headingEls = document.querySelectorAll(
    "article[data-doc-index] :is(h1, h2, h3)"
  );
  if (headingEls.length === 0) return;

  const visible = new Set<Element>();

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.add(entry.target);
        } else {
          visible.delete(entry.target);
        }
      }

      // Pick the first visible heading in document order
      for (const el of headingEls) {
        if (visible.has(el)) {
          activeHeading.value = el.id;
          break;
        }
      }
    },
    {
      rootMargin: "-64px 0px -70% 0px",
      threshold: 0,
    }
  );

  for (const el of headingEls) {
    observer.observe(el);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    activeHeading.value = id;
  }
}
</script>

<template>
  <div
    class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:px-6 md:py-24"
  >
    <!-- Sticky sidebar -->
    <aside class="hidden md:block md:w-64 md:shrink-0">
      <div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <nav class="flex flex-col gap-1">
          <button
            v-for="heading in headings"
            :key="heading.id"
            :class="[
              'rounded-md px-3 py-1.5 text-left text-sm transition-colors',
              heading.level === 1 ? 'font-semibold text-foreground' : '',
              heading.level === 2 ? 'pl-5 text-muted-foreground' : '',
              heading.level === 3 ? 'pl-7 text-sm text-muted-foreground' : '',
              activeHeading === heading.id
                ? 'bg-muted text-foreground'
                : 'hover:bg-muted hover:text-foreground',
            ]"
            @click="scrollToHeading(heading.id)"
          >
            {{ heading.text }}
          </button>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <article class="min-w-0 flex-1" data-doc-index>
      <h1
        class="mb-10 text-center text-4xl font-bold tracking-tight md:text-5xl"
      >
        {{ title }}
      </h1>
      <div
        class="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
        v-html="html"
      />
    </article>
  </div>
</template>
