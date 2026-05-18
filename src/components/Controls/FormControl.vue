<template>
  <component :is="component" ref="controlRef" v-bind="attrs" />
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import AttachImage from './AttachImage.vue';
import Attachment from './Attachment.vue';
import AutoComplete from './AutoComplete.vue';
import Check from './Check.vue';
import Button from './Button.vue';
import Color from './Color.vue';
import Currency from './Currency.vue';
import Data from './Data.vue';
import Date from './Date.vue';
import Datetime from './Datetime.vue';
import DynamicLink from './DynamicLink.vue';
import Float from './Float.vue';
import Int from './Int.vue';
import Link from './Link.vue';
import Select from './Select.vue';
import Text from './Text.vue';
import Secret from './Secret.vue';

const components: Record<string, any> = {
  AttachImage,
  Data,
  Check,
  Button,
  Color,
  Select,
  Link,
  Date,
  Datetime,
  AutoComplete,
  DynamicLink,
  Int,
  Float,
  Attachment,
  Currency,
  Text,
  Secret,
};

defineOptions({
  inheritAttrs: false,
});

const attrs = useAttrs();
const controlRef = ref<any>(null);

const component = computed(() => {
  const df = (attrs.df as any) ?? {};
  const fieldtype = df.fieldtype;
  return components[fieldtype] ?? Data;
});

const clear = () => {
  const input = controlRef.value?.$refs?.input;
  if (input instanceof HTMLInputElement) {
    input.value = '';
  }
};

const select = () => {
  controlRef.value?.$refs?.input?.select();
};

const focus = () => {
  controlRef.value?.focus();
};

const getInput = () => {
  return controlRef.value?.$refs?.input;
};

defineExpose({
  clear,
  select,
  focus,
  getInput,
});
</script>
