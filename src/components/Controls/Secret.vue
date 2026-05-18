<template>
  <Base
    v-bind="props"
    input-type="password"
  />
</template>

<script setup lang="ts">
import Base from './Base.vue';
import { BaseControlProps } from 'src/composables/useBaseControl';

const props = defineProps<BaseControlProps>();
</script>
