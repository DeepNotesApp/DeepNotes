<template>
  <div style="font-size: 28px; font-weight: bold">
    Can I use DeepNotes while offline?
  </div>

  <Gap style="height: 36px" />

  <div style="max-width: 500px">
    <p>As of now, DeepNotes does not support offline usage.</p>

    <p>
      This is due to the complexities in performing data synchronization after
      the user goes back online.
    </p>

    <p>
      It could be made possible in the future, but implementing it would require
      significant engineering efforts.
    </p>
  </div>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: 'How to create a group? - Help - DeepNotes',
}));
</script>
