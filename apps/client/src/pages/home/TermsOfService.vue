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
                @click="scrollToAnchor('legal-entity-status')"
              >
                <q-item-section>Legal Entity Status</q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('user-responsibility')"
              >
                <q-item-section>User Responsibility</q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('acceptable-use')"
              >
                <q-item-section>Acceptable use</q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('account-suspension')"
              >
                <q-item-section>Account suspension</q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('limitation-of-liability')"
              >
                <q-item-section>Limitation of liability</q-item-section>
              </q-item>

              <q-item
                clickable
                dense
                style="font-weight: bold; font-size: 18px"
                @click="scrollToAnchor('contact-information')"
              >
                <q-item-section>Contact information</q-item-section>
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
            Terms of Service
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
  ## Legal Entity Status

  When we say “we”, “our”, or “us” in this document, we are referring to Gustavo Toyota.
  DeepNotes is not a registered company and references to the app should not be taken as a representation of a legally formed entity.

  <br/>

  ## User Responsibility

  ### Security of Devices and Email Account

  You are responsible for maintaining the security of your devices and email account.
  We cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.

  ### Account Content and Activity

  You are responsible for all content posted and activity that occurs under your account.

  ### Human Account Requirement

  You must be a human. Accounts registered by “bots” or other automated methods are not permitted.

  <br/>

  ## Acceptable Use

  ### Server Resource Abuse

  We do not tolerate the abuse of our server resources.
  If your usage of the services exceeds the average usage of other customers, we reserve the right to temporarily disable your account.
  In most cases, we will reach out to you before taking any action, except in rare circumstances where excessive use may negatively impact the performance of the service for other customers.

  ### Inappropriate Content

  We do not accept the display of inappropriate content on public groups.
  
  <br/>

  ## Account Suspension

  We reserve the right to temporarily disable your account if violate any of the terms of acceptable use.
  The account owner will be reached out to before taking any action, except in rare cases where the level of use may negatively impact the Service for other customers.
  
  <br/>

  ## Limitation of Liability

  By using DeepNotes, you understand and agree that we shall not be liable for any direct, indirect, incidental, lost profits, special, consequential, punitive, or exemplary damages, including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses. This includes any damages that may result from:

  - The use or inability to use the services
  - The cost of obtaining substitute goods or services resulting from any goods, data, information, or services purchased or obtained through the services
  - Unauthorized access to or alteration of your transmissions or data
  - Statements or conduct of any third party on the service
  - Any other matter related to the terms of service or the services, whether it be a breach of contract, tort (including active or passive negligence), or any other theory of liability.

  <br/>

  ## Contact Information

  For any questions or concerns, please email us at contact@deepnotes.app.
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
