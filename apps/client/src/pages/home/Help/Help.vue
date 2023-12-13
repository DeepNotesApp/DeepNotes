<template>
  <q-page>
    <ResponsiveContainer>
      <Gap style="height: 130px" />

      <div style="font-size: 45px; font-weight: bold; text-align: center">
        {{ $t('help') }}
      </div>

      <Gap style="height: 56px" />

      <ul class="question-list">
        <li>
          <router-link :to="{ name: 'help/what-is-deepnotes' }">
            What is DeepNotes? Also, why?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/forgot-password' }">
            I've forgotten my password. What can I do?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/offline-usage' }">
            Can I use DeepNotes while offline?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/multi-page-text-search' }">
            Can I search text across multiple pages?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/roadmap' }">
            Is there a roadmap?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/creating-group' }">
            How to create a group?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/inviting-users' }">
            How to invite users to a group?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/joining-group' }">
            How to join a group?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/refund-policy' }">
            What is the refund policy on DeepNotes?
          </router-link>
        </li>

        <li>
          <router-link :to="{ name: 'help/subscription-expiration' }">
            What happens when my subscription expires?
          </router-link>
        </li>
      </ul>

      <Gap style="height: 80px" />

      <div style="font-size: 16px">
        Have other questions? Feel free to reach out on our socials.<br />
        We are most active on
        <a href="https://discord.gg/UaF2gPTUPh"><b>Discord</b></a
        >.
      </div>

      <Gap style="height: 160px" />
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

useMeta(() => ({
  title: `${t('help')} - DeepNotes`,
}));
</script>

<style scoped lang="scss">
.question-list {
  padding-left: 48px;

  font-size: 17px;
  font-weight: bold;

  > li::marker {
    font-size: 24px;
  }
}
</style>
