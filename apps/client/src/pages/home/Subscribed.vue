<template>
  <q-page>
    <ResponsiveContainer
      style="
        max-width: 700px;
        display: flex;
        flex-direction: column;
        align-items: center;
      "
    >
      <Gap style="height: 128px" />

      <div
        style="
          max-width: 450px;
          font-size: 40px;
          font-weight: bold;
          text-align: center;
        "
      >
        Thanks for choosing the Pro Plan!
      </div>

      <Gap style="height: 48px" />

      Enjoy unlimited pages, collaborative groups, and version history for your
      notes!<br />

      <br />

      You can close this page and go back to the app.

      <Gap style="height: 160px" />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: 'Thanks for choosing the Pro Plan! - DeepNotes',
}));
</script>
