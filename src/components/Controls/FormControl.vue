<template>
  <component :is="component" v-bind="$attrs" ref="control" />
</template>

<script setup lang="ts">
import { ref, computed, useAttrs } from 'vue';
import AttachImage from './AttachImage.vue';
import Attachment from './Attachment.vue';
import AutoComplete from './AutoComplete.vue';
import Check from './Check.vue';
import Button from './Button.vue';
import Color from './Color.vue';
import Currency from './Currency.vue';
import Data from './Data.vue';
import DateVue from './Date.vue';
import Datetime from './Datetime.vue';
import DynamicLink from './DynamicLink.vue';
import Float from './Float.vue';
import Int from './Int.vue';
import Link from './Link.vue';
import Select from './Select.vue';
import Text from './Text.vue';
import Secret from './Secret.vue';

defineOptions({
  name: 'FormControl',
});

const components: Record<string, any> = {
  AttachImage,
  Data,
  Check,
  Button,
  Color,
  Select,
  Link,
  Date: DateVue,
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

const attrs = useAttrs();
const component = computed(() => {
  const fieldtype = (attrs.df as any)?.fieldtype;
  return components[fieldtype] ?? Data;
});

const control = ref<any>(null);

function clear() {
  const input = control.value?.$refs?.input;
  if (input instanceof HTMLInputElement) {
    input.value = '';
  }
}

function select() {
  control.value?.$refs?.input?.select?.();
}

function focus() {
  if (typeof control.value?.focus === 'function') {
    control.value.focus();
  }
}

function getInput() {
  return control.value?.$refs?.input;
}

defineExpose({
  clear,
  select,
  focus,
  getInput,
});
</script>
