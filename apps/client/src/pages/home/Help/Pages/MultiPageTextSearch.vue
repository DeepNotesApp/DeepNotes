<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    <p>No, DeepNotes does not support searching text across multiple pages.</p>

    <p>
      We have decided to prioritize extreme privacy with end-to-end encryption,
      and as a trade-off, we had to let go of the ability to search text across
      multiple pages.
    </p>

    <p>
      Each page's content is encrypted separately, and the system does not
      retain access to decrypted content or maintain any searchable indexes,
      thus making high-performance text search across multiple pages impossible.
    </p>

    <p>
      While we acknowledge that searching across multiple pages may be very
      important for some users, we firmly believe that the trade-off was
      necessary to uphold the integrity of our application.
    </p>
  </div>
</template>

<script setup lang="ts">
const title = 'Can I search text across multiple pages?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>
