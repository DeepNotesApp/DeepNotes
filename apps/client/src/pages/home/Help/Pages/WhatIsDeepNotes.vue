<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    <p>
      DeepNotes is a note-taking tool being developed since 2022 to bring more
      <b>simplicity</b>, <b>freedom</b>, and <b>privacy</b> to the note-taking
      game.
    </p>

    <p>It was born out of the frustration with popular note-taking tools.</p>

    <div>
      These are some of the bad things they do and how DeepNotes solves them:
    </div>
    <ol>
      <li>
        <b>Most note-taking apps lock you in a single wall of text:</b>
        DeepNotes solves this by using floating notes in infinite canvases. This
        lets you create many separate walls of text in the same page.
      </li>

      <li>
        <b>
          Many lock you in a tree-like page hierarchy, which gets harder to
          maintain over time:
        </b>
        DeepNotes uses a detached page system, that is, it doesn't lock you into
        any page hierarchy. You create your own page navigation structure by
        linking your pages with eachother.
      </li>

      <li>
        <b>
          They add numerous complex features that clutter the app and feel out
          of place:
        </b>
        DeepNotes focuses on the core note-taking experience. It's just notes
        and arrows inside pages. That's it.
      </li>

      <li>
        <b>They don't care about the privacy of your data:</b> DeepNotes uses
        end-to-end encryption to keep your notes extremely well protected. Only
        you have access to your data.
      </li>
    </ol>

    DeepNotes is being developed by
    <a
      href="https://gustavotoyota.dev"
      target="_blank"
      >Gustavo Toyota</a
    >, a brazilian software developer passionate for learning and concept
    visualization.
  </div>
</template>

<script setup lang="ts">
const title = 'What is DeepNotes? Also, why?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>

<style scoped lang="scss">
.highlight {
  background-color: #585800;
}

li {
  margin-bottom: 12px;
}
</style>
