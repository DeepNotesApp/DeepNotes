<template>
  <q-infinite-scroll>
    <slot></slot>

    <template v-slot:loading>
      <div class="row justify-center q-my-md">
        <q-circular-progress
          indeterminate
          size="md"
        />
      </div>
    </template>
  </q-infinite-scroll>
</template>
