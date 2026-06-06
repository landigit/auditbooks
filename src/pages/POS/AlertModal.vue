<template>
  <Modal class="h-auto px-6 select-none" :set-close-listener="false">
    <text class="text-center font-semibold py-3">{{ t`Alert` }}</text>
    <view class="border-b border-border" />
    <text class="py-6">
      {{ t`Clicking continue will remove all the selected items.` }}
    </text>

    <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto pb-6">
      <view class="flex col-span-2 gap-5">
        <Button
          class="py-5 w-full bg-indicator-red-bg"
          @tap="emit('toggleModal', 'Alert')"
        >
          <slot>
            <text
              class="uppercase text-lg text-indicator-red-text font-semibold"
            >
              {{ t`Cancel` }}
            </text>
          </slot>
        </Button>

        <Button
          class="w-full py-5 bg-indicator-green-bg"
          @tap="
            routeTo('/list/SalesInvoice');
            emit('toggleModal', 'Alert');
          "
        >
          <slot>
            <text
              class="uppercase text-lg text-indicator-green-text font-semibold"
            >
              {{ t`Continue` }}
            </text>
          </slot>
        </Button>
      </view>
      <view class="col-span-2 flex justify-center mt-3">
        <Button
          class="w-full py-5 bg-indicator-blue-bg"
          @tap="emit('saveAndContinue')"
        >
          <slot>
            <text
              class="uppercase text-lg text-indicator-blue-text font-semibold"
            >
              {{ t`Save and Continue` }}
            </text>
          </slot>
        </Button>
      </view>
    </view>
  </Modal>
</template>

<script setup lang="ts">
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import { routeTo } from 'src/utils/ui';
import { t } from 'fyo';

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
  (e: 'saveAndContinue', value?: any): void;
}>();
</script>
