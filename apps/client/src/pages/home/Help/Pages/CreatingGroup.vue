<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 700px">
    You can create private and public groups if you're
    <b>subscribed to the pro plan</b>.<br />

    <br />

    In order to create a group you have to:

    <ol>
      <li>
        <b>Open the New page dialog</b> by clicking on <b>Create new page</b> or
        <b>Create with options</b> on the expanded right sidebar.<br />

        <br />

        <div>
          <img
            style="
              vertical-align: top;
              border: 1px solid rgba(255, 255, 255, 0.3);
            "
            src="/help/creating-group/create-new-page.webp"
          />

          <InlineGap style="width: 24px" />

          <img
            style="
              vertical-align: top;
              border: 1px solid rgba(255, 255, 255, 0.3);
            "
            src="/help/creating-group/create-with-options.webp"
          />
        </div>

        <br />
      </li>

      <li>
        Select <b>(New group)</b> as the target group of the new page.<br />

        <br />

        <div>
          <img
            style="
              vertical-align: top;
              border: 1px solid rgba(255, 255, 255, 0.3);
            "
            src="/help/creating-group/new-page-dialog.webp"
          />

          <InlineGap style="width: 24px" />

          <img
            style="
              vertical-align: top;
              border: 1px solid rgba(255, 255, 255, 0.3);
            "
            src="/help/creating-group/new-page-dialog-group.webp"
          />
        </div>

        <br />
      </li>

      <li>
        Fill the group creation fields and click Ok.<br />

        <br />

        <img
          style="
            vertical-align: top;
            border: 1px solid rgba(255, 255, 255, 0.3);
          "
          src="/help/creating-group/new-group.webp"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
const title = 'How to create a group?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>
