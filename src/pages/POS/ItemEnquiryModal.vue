<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <text class="text-center font-semibold py-3">{{ t`Item Enquiry` }}</text>
    <view class="px-10">
      <view class="border-b border-border"   />
      <view class="flex flex-col gap-5 pt-8">
        <Link
          :df="{
            fieldname: 'item',
            fieldtype: 'Link',
            target: 'Item',
            label: t`Item`,
            required: true,
          }"
          :value="ItemEnquiry.item"
          :border="true"
          :show-label="true"
          @change="(value: string) => (ItemEnquiry.item = value)"
        />

        <Text
          :df="{
            fieldname: 'description',
            fieldtype: 'Text',
            label: t`Description`,
          }"
          :value="ItemEnquiry.description"
          :border="true"
          :show-label="true"
          @change="(value: string) => (ItemEnquiry.description = value)"
        />

        <Link
          :df="{
            fieldname: 'customer',
            fieldtype: 'Link',
            target: 'Party',
            label: t`Customer`,
          }"
          :value="ItemEnquiry.customer"
          :border="true"
          :show-label="true"
          @change="
            (value: string) => {
              ItemEnquiry.customer = value;
              updateCustomerContact(value);
            }
          "
        />

        <Data
          :df="{
            fieldname: 'contact',
            fieldtype: 'Data',
            label: t`Contact`,
          }"
          :value="ItemEnquiry.contact"
          :border="true"
          :show-label="true"
          @change="(value: string) => (ItemEnquiry.contact = value)"
        />

        <Link
          :df="{
            fieldname: 'similarProduct',
            fieldtype: 'Link',
            target: 'Item',
            label: t`Similar Product`,
          }"
          :value="ItemEnquiry.similarProduct"
          :border="true"
          :show-label="true"
          @change="(value: string) => (ItemEnquiry.similarProduct = value)"
        />
      </view>

      <view class="grid grid-cols-2 gap-4 mt-10 mb-4">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-green-bg"
            style="padding: 1.35rem"
            @tap="submitForm"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-green-text font-semibold"
              >
                {{ t`Submit` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>

      <view class="grid grid-cols-2 gap-4 mb-6">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-red-bg"
            style="padding: 1.35rem"
            @tap="closeModal"
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
import { ref } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';
import Link from 'src/components/Controls/Link.vue';
import Text from 'src/components/Controls/Text.vue';
import Data from 'src/components/Controls/Data.vue';
import { ItemEnquiry as ItemEnquiryClass } from 'models/baseModels/ItemEnquiry/ItemEnquiry';
import { ModelNameEnum } from 'models/types';
import { DocValueMap } from 'fyo/core/types';
import { fyo } from 'src/initFyo';

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
}>();

// Reactive State
const ItemEnquiry = ref<Partial<ItemEnquiryClass>>({});

// Methods
const updateCustomerContact = async (customer: string) => {
  ItemEnquiry.value.contact =
    ((await fyo.getValue('Party', customer, 'phone')) as string) || '';
};

const submitForm = async () => {
  try {
    const itemEnquiryDoc = fyo.doc.getNewDoc(
      ModelNameEnum.ItemEnquiry,
      ItemEnquiry.value as DocValueMap
    );
    await itemEnquiryDoc.sync();
    showToast({
      type: 'success',
      message: t`Item enquiry submitted`,
    });
    clearValues();
    emit('toggleModal', 'ItemEnquiry');
  } catch (error) {
    showToast({
      type: 'error',
      message: t`${error as string}`,
    });
  }
};

const clearValues = () => {
  ItemEnquiry.value = {};
};

const closeModal = () => {
  clearValues();
  emit('toggleModal', 'ItemEnquiry');
};
</script>
