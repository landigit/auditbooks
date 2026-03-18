<script setup lang="ts">
import { Field as VeeField } from 'vee-validate';
import { provide } from 'vue';

const props = defineProps<{
  name: string;
}>();

provide('FORM_FIELD_NAME', props.name);
</script>

<template>
  <VeeField :name="name" v-bind="$attrs" v-slot="{ field, errors, meta, value, handleChange, handleBlur }">
    <slot :field="field" :errors="errors" :meta="meta" :value="value" :handle-change="handleChange" :handle-blur="handleBlur" />
  </VeeField>
</template>
