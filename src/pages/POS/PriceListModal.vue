<template>
  <view v-if="!isLynx">
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
  </view>
  <view
    v-else
    class="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4"
  >
    <view
      class="bg-canvas border border-border rounded-2xl w-full max-w-sm p-4 flex-col"
    >
      <text class="text-lg font-bold text-main mb-3">{{
        t`Apply Price List`
      }}</text>
      <view class="border-b border-border mb-4" />

      <view class="mb-4 flex-row items-center gap-2">
        <view class="flex-1">
          <text class="text-sm font-semibold text-main mb-2">{{
            t`Price List`
          }}</text>
          <Link
            v-if="sinvDoc.fieldMap"
            class="w-full"
            :border="true"
            :value="sinvDoc?.priceList"
            :df="sinvDoc.fieldMap.priceList"
            @change="(value) => applyPriceList(value)"
          />
        </view>
        <view
          v-if="sinvDoc?.priceList"
          class="p-2.5 rounded bg-danger-muted border border-danger/20 mt-6"
          @tap="removePriceList"
        >
          <text class="text-xs text-danger font-semibold">{{ t`Clear` }}</text>
        </view>
      </view>

      <view class="flex-row gap-2 mt-2">
        <view
          class="flex-1 py-2.5 rounded bg-danger-muted items-center justify-center"
          @tap="cancelPriceList"
        >
          <text class="text-xs text-danger font-semibold">{{ t`Cancel` }}</text>
        </view>
        <view
          class="flex-1 py-2.5 rounded bg-success items-center justify-center"
          @tap="setPriceList"
        >
          <text class="text-xs text-white font-semibold">{{ t`Save` }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { t } from 'fyo';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';
import { showToast } from 'src/utils/interactive';
import Link from 'src/components/Controls/Link.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { isLynx } from 'src/utils/interactive';
/* Define Emits */ const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
}>(); /* App Store / Context Injections */
const sinvDoc = inject('sinvDoc') as SalesInvoice;
/* Methods */ const removePriceList = async () => {
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
    showToast({ type: 'error', message: t`${error as string}` });
  }
};
const cancelPriceList = () => {
  emit('toggleModal', 'PriceList');
};
const setPriceList = () => {
  emit('toggleModal', 'PriceList');
};
</script>
