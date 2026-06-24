<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <p class="text-center font-semibold py-3">{{ t`Apply Price List` }}</p>
    <div class="px-10">
      <hr class="dark:border-gray-800" />
      <div class="flex justify-center pt-10">
        <div class="flex justify-between w-full mb-20">
          <div class="w-full">
            <Link
              v-if="sinvDoc.fieldMap"
              class="flex-shrink-0 w-full"
              :border="true"
              :value="sinvDoc?.priceList"
              :focus-input="true"
              :df="sinvDoc.fieldMap.priceList"
              @change="(value) => applyPriceList(value)"
            />
          </div>
          <div class="w-10 flex justify-end items-center">
            <feather-icon
              name="trash"
              class="w-5 text-xl text-red-500"
              @click="removePriceList"
            />
          </div>
        </div>
      </div>

      <div class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-2">
        <div class="col-span-2">
          <Button
            class="w-full bg-green-500 dark:bg-green-700"
            style="padding: 1.35rem"
            @click="setPriceList"
          >
            <slot>
              <p class="uppercase text-lg text-white font-semibold">
                {{ t`Save` }}
              </p>
            </slot>
          </Button>
        </div>
      </div>

      <div class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-8">
        <div class="col-span-2">
          <Button
            class="w-full bg-red-500 dark:bg-red-700"
            style="padding: 1.35rem"
            @click="cancelPriceList"
          >
            <slot>
              <p class="uppercase text-lg text-white font-semibold">
                {{ t`Cancel` }}
              </p>
            </slot>
          </Button>
        </div>
      </div>
    </div>
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

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string): void;
}>();

const sinvDoc = inject('sinvDoc') as SalesInvoice;

async function removePriceList() {
  await sinvDoc.set('priceList', '');
}

async function applyPriceList(value?: string) {
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
}

function cancelPriceList() {
  emit('toggleModal', 'PriceList');
}

function setPriceList() {
  emit('toggleModal', 'PriceList');
}
</script>
