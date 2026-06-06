<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <text class="text-center font-semibold py-3">{{
      t`Apply Price List`
    }}</text>
    <view class="px-10">
      <view class="border-b border-border" />
      <view class="flex justify-center pt-10">
        <view class="flex justify-between w-full mb-20">
          <view class="w-full">
            <Link
              v-if="sinvDoc.fieldMap"
              class="flex-shrink-0 w-full"
              :border="true"
              :value="sinvDoc?.priceList"
              :focus-input="true"
              :df="sinvDoc.fieldMap.priceList"
              @change="(value) => applyPriceList(value)"
            />
          </view>
          <view class="w-10 flex justify-end items-center">
            <lucide-icon
              name="trash"
              class="w-5 text-xl text-error cursor-pointer"
              @tap="removePriceList"
            />
          </view>
        </view>
      </view>

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-2">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-green-bg"
            style="padding: 1.35rem"
            @tap="setPriceList"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-green-text font-semibold"
              >
                {{ t`Save` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-8">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-red-bg"
            style="padding: 1.35rem"
            @tap="cancelPriceList"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-red-text font-semibold"
              >
                {{ t`Cancel` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>
    </view>
  </Modal>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { t } from 'fyo';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';
import { showToast } from 'src/utils/interactive';
import Link from 'src/components/Controls/Link.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
}>();

// App Store / Context Injections
const sinvDoc = inject('sinvDoc') as SalesInvoice;

// Methods
const removePriceList = async () => {
  await sinvDoc.set('priceList', '');
};

const applyPriceList = async (value?: string) => {
  try {
    if (!value || value == sinvDoc.priceList) {
      return;
    }

    await sinvDoc.set('priceList', value);
    emit('toggleModal', 'PriceList');
  } catch (error) {
    showToast({
      type: 'error',
      message: t`${error as string}`,
    });
  }
};

const cancelPriceList = () => {
  emit('toggleModal', 'PriceList');
};

const setPriceList = () => {
  emit('toggleModal', 'PriceList');
};
</script>
