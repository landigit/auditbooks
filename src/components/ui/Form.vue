<script setup lang="ts">
import { Form } from 'vee-validate';
</script>

<template>
  <Form v-bind="$attrs">
    <slot />
  </Form>
</template>
