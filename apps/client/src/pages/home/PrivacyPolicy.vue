<template>
  <q-page>
    <ResponsiveContainer style="padding: 0">
      <div class="row">
        <div class="d-none d-lg-block col-3">
          <div
            style="position: sticky; overflow-y: auto; height: min-content"
            :style="{
              top: `${uiStore().headerHeight}px`,
              'max-height': `calc(100vh - ${uiStore().headerHeight}px)`,
            }"
          >
            <q-list style="padding: 80px 0">
              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('data-collection')"
              >
                <q-item-section> Data collection </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('data-protection')"
              >
                <q-item-section> Data protection </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('data-storage')"
              >
                <q-item-section> Data storage </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('data-processing')"
              >
                <q-item-section> Data processing </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('cookies')"
              >
                <q-item-section> Cookies </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('user-rights')"
              >
                <q-item-section> User rights </q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('contact')"
              >
                <q-item-section> Contact </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>

        <div
          class="col-12 col-lg-9"
          style="padding: 0 32px"
        >
          <Gap style="height: 96px" />

          <div style="font-size: 40px; font-weight: bold; text-align: center">
            Privacy Policy
          </div>

          <Gap style="height: 56px" />

          <div
            v-html="html"
            style="font-size: 16px"
          ></div>

          <Gap style="height: 140px" />
        </div>
      </div>
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import { marked } from 'marked';

const html = marked(`
  ## Data collection

  We collect four types of information from our users: email, end-to-end encrypted data, metadata, and usage data.
  Your email is used for identification and communication purposes.
  End-to-end encrypted data refers to the data you store in DeepNotes, such as notes and arrows.
  Metadata refers to information about your data, such as creation date.
  Usage data helps us measure and improve the app.

  ## Data protection

  DeepNotes uses end-to-end encryption to protect your information.
  Only you have the key to your information, making it inaccessible to anyone else, including DeepNotes.
  
  Your email is the only piece of information, along with metadata, that is not end-to-end encrypted.
  This is because we need to know your email in order to identify and communicate with you.
  In order to keep your email as protected as possible, we keep your email pepper-encrypted in our database.

  For more details on how we protect your data, please refer to our [security whitepaper](https://deepnotes.app/whitepaper).

  ## Data storage

  DeepNotes stores all of its data in the United States.
  While already being end-to-end encrypted, the data is also encrypted at rest.

  ## Data processing

  DeepNotes shares your email with [Stripe](https://stripe.com/) for payment processing.
  We also process usage data in order to helps us understand how people use DeepNotes and how to make the app better.
  Usage data is anonymous and can't be linked back to you.
  
  ## Cookies

  We use [Stripe](https://stripe.com/) for payment processing.
  Stripe introduces some cookies in order to fulfill their task.
  Apart from those cookies, DeepNotes only uses cookies for user authentication and session management.

  ## User rights

  You can delete your groups and pages at any time.

  You also have the option to delete your DeepNotes account at any time. When you delete your account, all your data will be permanently deleted from our database.

  ## Contact

  If you have any questions or concerns about your privacy while using DeepNotes, please feel free to reach out to us at contact@deepnotes.app.
  We are always here to help and will get back to you as soon as we can.
`);

function scrollToAnchor(anchor: string) {
  const targetTop =
    window.scrollY +
    document.getElementById(anchor)!.getBoundingClientRect().top -
    80;

  window.scrollTo({ top: targetTop, behavior: 'smooth' });
}
</script>

<style scoped>
.q-item {
  height: 40px;
}
</style>
