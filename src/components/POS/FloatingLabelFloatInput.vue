<template>
  <FloatingLabelInputBase v-bind="props" input-type="number" />
</template>

<script setup lang="ts">
import FloatingLabelInputBase from "./FloatingLabelInputBase.vue";
import { BaseControlProps } from "src/composables/useBaseControl";

const props = defineProps<BaseControlProps>();
</script>
