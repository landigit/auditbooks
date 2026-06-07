<template>
  <view v-if="!isLynx">
    <Modal class="h-auto w-96" :set-close-listener="false">
      <text class="text-center font-semibold py-3 text-main">
        {{ t`Select the Batch` }}
      </text>

      <view class="px-10 pt-6">
        <Link
          :df="{
            fieldname: 'batch',
            fieldtype: 'Link',
            target: 'Batch',
            label: t`Batch`,
            required: true,
            getOptions: getBatchOptions,
            filters: { item: itemCode },
          }"
          :value="selectedBatch"
          :border="true"
          :show-label="true"
          @change="(value: string) => (selectedBatch = value)"
        />

        <view class="mt-8 mb-6 grid grid-cols-2 gap-4">
          <Button
            class="w-full bg-indicator-green-bg"
            style="padding: 1.35rem"
            :disabled="!selectedBatch"
            @tap="submitSelection"
          >
            <text
              class="uppercase text-lg text-indicator-green-text font-semibold"
            >
              {{ t`Select` }}
            </text>
          </Button>

          <Button
            class="w-full bg-indicator-red-bg"
            style="padding: 1.35rem"
            @tap="closeModal"
          >
            <text
              class="uppercase text-lg text-indicator-red-text font-semibold"
            >
              {{ t`Cancel` }}
            </text>
          </Button>
        </view>
      </view>
    </Modal>
  </view>
  <view
    v-else
    class="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4"
  >
    <view
      class="bg-canvas border border-border rounded-2xl w-full max-w-sm p-4 flex-col"
    >
      <text class="text-lg font-bold text-main mb-3">{{
        t`Select the Batch`
      }}</text>
      <view class="border-b border-border mb-4" />

      <view class="mb-4">
        <text class="text-sm font-semibold text-main mb-2">{{ t`Batch` }}</text>
        <Link
          :df="{
            fieldname: 'batch',
            fieldtype: 'Link',
            target: 'Batch',
            label: t`Batch`,
            required: true,
            getOptions: getBatchOptions,
            filters: { item: itemCode },
          }"
          :value="selectedBatch"
          :border="true"
          :show-label="false"
          @change="(value: string) => (selectedBatch = value)"
        />
      </view>

      <view class="flex-row gap-2 mt-2">
        <view
          class="flex-1 py-2.5 rounded bg-danger-muted items-center justify-center"
          @tap="closeModal"
        >
          <text class="text-xs text-danger font-semibold">{{ t`Cancel` }}</text>
        </view>
        <view
          class="flex-1 py-2.5 rounded bg-success items-center justify-center"
          :class="!selectedBatch ? 'opacity-50' : ''"
          @tap="selectedBatch ? submitSelection() : null"
        >
          <text class="text-xs text-white font-semibold">{{ t`Select` }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';
import Link from 'src/components/Controls/Link.vue';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { isLynx } from 'src/utils/interactive';
/* Define Props */ const props = defineProps<{
  itemCode: string;
}>();
/* Define Emits */ const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
  (e: 'batchSelected', value: string): void;
}>();
/* Reactive State */ const selectedBatch = ref('');
/* Methods */ const getBatchOptions = async () => {
  if (!props.itemCode) {
    return [];
  }
  try {
    const batches = (await fyo.db.getAll(ModelNameEnum.Batch, {
      filters: { item: props.itemCode },
      fields: ['name'],
    })) as { name: string; itemCode: string }[];
    return batches.map((b) => ({ label: b.name, value: b.name }));
  } catch (error) {
    showToast({ type: 'error', message: t`Failed to load batches` });
    return [];
  }
};
const submitSelection = () => {
  emit('batchSelected', selectedBatch.value);
  emit('toggleModal', 'BatchSelection');
  selectedBatch.value = '';
};
const closeModal = () => {
  emit('toggleModal', 'BatchSelection');
  selectedBatch.value = '';
};
</script>
