<template>
  <div
    class="row"
    style="justify-content: center"
  >
    <!-- Basic plan -->

    <div
      class="col-12 col-md-6"
      style="display: flex; max-width: 350px"
    >
      <div
        style="
          flex: 1;

          margin: 16px;
          padding: 28px;

          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
        "
      >
        <div style="font-size: 30px; font-weight: bold">Basic plan</div>

        <Gap style="height: 32px" />

        <div style="text-align: center; font-weight: bold">
          <span style="font-size: 46px">$0</span>
          <span style="font-size: 12px; color: #d0d0d0">/ month</span>
        </div>

        <Gap style="height: 32px" />

        <ul style="margin: 0; padding-inline-start: 48px; font-size: 14px">
          <li>
            <q-icon
              name="mdi-note"
              size="28px"
              class="feature-icon"
            />

            Create up to <b>10 pages</b>
          </li>

          <Gap style="height: 8px" />

          <li>
            <q-icon
              name="mdi-account"
              size="28px"
              class="feature-icon"
            />

            <b>Personal</b> use only
          </li>
        </ul>

        <Gap style="height: 32px" />

        <DeepBtn
          label="See more details"
          color="primary"
          style="width: 100%"
          :to="{ name: 'pricing' }"
        />
      </div>
    </div>

    <!-- Pro plan -->

    <div
      class="col-12 col-md-6"
      style="display: flex; max-width: 350px"
    >
      <div
        style="
          flex: 1;

          margin: 16px;
          padding: 28px;

          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
        "
      >
        <div style="font-size: 30px; font-weight: bold">Pro plan</div>

        <Gap style="height: 32px" />

        <div style="text-align: center; font-weight: bold">
          <span style="font-size: 46px">$5</span>
          <span style="font-size: 12px; color: #d0d0d0">/ month</span>
        </div>

        <Gap style="height: 32px" />

        <ul style="margin: 0; padding-inline-start: 48px; font-size: 14px">
          <li>
            <q-icon
              name="mdi-note"
              size="28px"
              class="feature-icon"
            />

            Create <b>unlimited pages</b>
          </li>

          <Gap style="height: 8px" />

          <li>
            <q-icon
              name="mdi-account-group"
              size="28px"
              class="feature-icon"
            />

            Create <b>collaborative groups</b>
          </li>
        </ul>

        <Gap style="height: 32px" />

        <DeepBtn
          label="See more details"
          color="primary"
          style="width: 100%"
          :to="{ name: 'pricing' }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
ul :deep() {
  list-style: none;

  > li {
    position: relative;

    margin-bottom: 8px;
  }
}

.feature-icon {
  position: absolute;
  left: -44px;
  top: -3px;
}
</style>
