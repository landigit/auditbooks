<template>
  <Base v-bind="props" input-type="number" :parse="parse" />
</template>

<script setup lang="ts">
import Base from './Base.vue';
import { BaseControlProps } from 'src/composables/useBaseControl';
import { safeParseInt } from 'src/utils/core/index';

const props = defineProps<BaseControlProps>();

const parse = (value: unknown): number => {
  return safeParseInt(value);
};
</script>
