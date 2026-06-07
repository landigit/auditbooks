<template>
  <view v-if="!isLynx">
    <view class="w-form">
      <FormHeader :form-title="t`Set Print Size`" />
      <view class="border-b border-border" />
      <view class="p-4 w-full flex flex-col gap-4">
        <text class="text-base text-main">
          {{ t`Select the template type.` }}
        </text>
        <Select
          :df="df"
          :value="type"
          :border="true"
          :show-label="true"
          @change="typeChange"
        />
      </view>
      <view class="flex border-t border-border p-4">
        <Button class="ml-auto" type="primary" @tap="done">{{
          t`Done`
        }}</Button>
      </view>
    </view>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Set Type</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PrintTemplate } from 'models/baseModels/PrintTemplate';
import { OptionField } from 'schemas/types';
import Button from 'src/components/Button.vue';
import Select from 'src/components/Controls/Select.vue';
import FormHeader from 'src/components/FormHeader.vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

// Define Props
const props = defineProps<{
  doc: PrintTemplate;
}>();

// Define Emits
const emit = defineEmits<{
  (e: 'done'): void;
}>();

// Reactive State
const type = ref('SalesInvoice');

// Computed Properties
const df = computed<OptionField>(() => {
  const options = PrintTemplate.lists.type!(props.doc) as {
    value: string;
    label: string;
  }[];
  return {
    ...fyo.getField('PrintTemplate', 'type'),
    options,
    fieldtype: 'Select',
    default: options[0].value,
  };
});

// Methods
const typeChange = (v: string) => {
  if (type.value === v) {
    return;
  }

  type.value = v;
};

const done = async () => {
  await props.doc.set('type', type.value);
  emit('done');
};

// Lifecycles
onMounted(() => {
  type.value = props.doc.type ?? 'SalesInvoice';
});
</script>
