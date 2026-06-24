<template>
  <Modal class="h-auto px-6 select-none" :set-close-listener="false">
    <p class="text-center font-semibold py-3">{{ t`Alert` }}</p>
    <hr class="dark:border-gray-800" />
    <p class="py-6">
      {{ t`Clicking continue will remove all the selected items.` }}
    </p>

    <div class="row-start-6 grid grid-cols-2 gap-4 mt-auto pb-6">
      <div class="flex col-span-2 gap-5">
        <Button
          class="py-5 w-full"
          type="secondary"
          @click="$emit('toggleModal', 'Alert')"
        >
          <span class="uppercase text-lg font-semibold">
            {{ t`Cancel` }}
          </span>
        </Button>

        <Button
          class="w-full py-5"
          type="primary"
          @click="
            routeTo('/list/SalesInvoice');
            $emit('toggleModal', 'Alert');
          "
        >
          <span class="uppercase text-lg font-semibold">
            {{ t`Continue` }}
          </span>
        </Button>
      </div>
      <div class="col-span-2 flex justify-center mt-3">
        <Button
          class="w-full py-5"
          type="primary"
          @click="$emit('saveAndContinue')"
        >
          <span class="uppercase text-lg font-semibold">
            {{ t`Save and Continue` }}
          </span>
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import { routeTo } from 'src/utils/ui';
import { t } from 'fyo';

defineEmits<{
  (e: 'toggleModal', modalName: string): void;
  (e: 'saveAndContinue', value?: any): void;
}>();
</script>
