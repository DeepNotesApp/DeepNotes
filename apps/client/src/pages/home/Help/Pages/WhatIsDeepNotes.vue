<template>
  <div style="font-size: 28px; font-weight: bold">
    What is DeepNotes? Also, why?
  </div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    <p>
      DeepNotes is a note-taking tool being developed since 2022 to bring more
      <b>freedom</b>, <b>simplicity</b>, and <b>privacy</b> to the note-taking
      game.
    </p>

    <p>
      It was born out of the frustration with popular note-taking tools like
      Notion, Obsidian, Roam Research, and Heptabase.
    </p>

    <div>
      These are some of the bad things they do and how DeepNotes solves them:
    </div>
    <ol>
      <li>
        <b>Most note-taking apps lock you in a single wall of text:</b>
        DeepNotes solves this by using floating notes in infinite canvases. This
        lets you create several separate walls of text in the same page.
      </li>

      <li>
        <b>
          Many lock you in a tree-like page hierarchy, which gets harder to
          maintain over time (e.g. Notion):
        </b>
        DeepNotes uses a detached page system, that is, it doesn't lock you into
        any page hierarchy. You create your own page navigation structure by
        linking your pages with eachother.
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
useMeta(() => ({
  title: 'How to create a group? - Help - DeepNotes',
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
