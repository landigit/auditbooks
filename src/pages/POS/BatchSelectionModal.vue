<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <p class="text-center font-semibold py-3 text-main">
      {{ t`Select the Batch` }}
    </p>

    <div class="px-10 pt-6">
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

      <div class="mt-8 mb-6 grid grid-cols-2 gap-4">
        <Button
          class="w-full bg-indicator-green-bg"
          style="padding: 1.35rem"
          :disabled="!selectedBatch"
          @click="submitSelection"
        >
          <p class="uppercase text-lg text-indicator-green-text font-semibold">
            {{ t`Select` }}
          </p>
        </Button>

        <Button
          class="w-full bg-indicator-red-bg"
          style="padding: 1.35rem"
          @click="closeModal"
        >
          <p class="uppercase text-lg text-indicator-red-text font-semibold">
            {{ t`Cancel` }}
          </p>
        </Button>
      </div>
    </div>
  </Modal>
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

// Define Props
const props = defineProps<{
  itemCode: string;
}>();

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
  (e: 'batchSelected', value: string): void;
}>();

// Reactive State
const selectedBatch = ref('');

// Methods
const getBatchOptions = async () => {
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
