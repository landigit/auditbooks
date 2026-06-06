<template>
  <Base v-bind="props" input-type="number" :parse="parse" />
</template>

<script setup lang="ts">
import Base from "./Base.vue";
import { BaseControlProps } from "src/composables/useBaseControl";
import { safeParseFloat } from "utils/index";

const props = defineProps<BaseControlProps>();

const parse = (value: unknown): number => {
  return safeParseFloat(value);
};
</script>
