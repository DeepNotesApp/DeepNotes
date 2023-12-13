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

          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;

          background-color: #222222;
        "
      >
        <div style="font-size: 30px; font-weight: bold">
          {{ $t('basicPlan') }}
        </div>

        <Gap style="height: 32px" />

        <div style="text-align: center">
          <span style="font-size: 46px">$0</span>
          <span style="font-size: 12px; color: #d0d0d0; font-weight: bold"
            >/ month</span
          >
        </div>

        <Gap style="height: 32px" />

        <ul style="margin: 0; padding-inline-start: 48px; font-size: 14px">
          <li>
            <q-icon
              name="mdi-note"
              size="28px"
              class="feature-icon"
            />

            <span v-html="$t('createUpTo50Pages')"></span>
          </li>

          <Gap style="height: 8px" />

          <li>
            <q-icon
              name="mdi-account"
              size="28px"
              class="feature-icon"
            />

            <span v-html="$t('personalUseOnly')"></span>
          </li>
        </ul>

        <Gap style="height: 32px" />

        <DeepBtn
          :label="$t('seeMoreDetails')"
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

          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;

          background-color: #222222;
        "
      >
        <div style="font-size: 30px; font-weight: bold">
          {{ $t('proPlan') }}
        </div>

        <Gap style="height: 32px" />

        <div style="text-align: center; position: relative">
          <span style="font-size: 46px">
            ${{ billingFrequency === 'monthly' ? 4.99 : 3.99 }}
          </span>
          <span style="font-size: 12px; color: #d0d0d0">/ month</span>

          <div
            v-if="billingFrequency === 'yearly'"
            style="
              position: absolute;
              width: 100%;
              margin-top: -7px;
              text-align: center;
              font-size: 13px;
              color: #d0d0d0;
            "
          >
            (billed anually)
          </div>
        </div>

        <Gap style="height: 32px" />

        <ul style="margin: 0; padding-inline-start: 48px; font-size: 14px">
          <li>
            <q-icon
              name="mdi-note"
              size="28px"
              class="feature-icon"
            />

            <span v-html="$t('createUnlimitedPages')"></span>
          </li>

          <Gap style="height: 8px" />

          <li>
            <q-icon
              name="mdi-account-group"
              size="28px"
              class="feature-icon"
            />

            <span v-html="$t('createCollaborativeGroups')"></span>
          </li>
        </ul>

        <Gap style="height: 32px" />

        <DeepBtn
          :label="$t('seeMoreDetails')"
          color="primary"
          style="width: 100%"
          :to="{ name: 'pricing' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  billingFrequency: 'monthly' | 'yearly';
}>();
</script>

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
