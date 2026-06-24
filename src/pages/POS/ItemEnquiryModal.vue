<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <p class="text-center font-semibold py-3">{{ t`Item Enquiry` }}</p>
    <div class="px-10">
      <hr class="dark:border-gray-800" />
      <div class="flex flex-col gap-5 pt-8">
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
      </div>

      <div class="grid grid-cols-2 gap-4 mt-10 mb-4">
        <div class="col-span-2">
          <Button
            class="w-full bg-green-500 dark:bg-green-700"
            style="padding: 1.35rem"
            @click="submitForm"
          >
            <slot>
              <p class="uppercase text-lg text-white font-semibold">
                {{ t`Submit` }}
              </p>
            </slot>
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="col-span-2">
          <Button
            class="w-full bg-red-500 dark:bg-red-700"
            style="padding: 1.35rem"
            @click="closeModal"
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
import { ref } from 'vue';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import { showToast } from 'src/utils/interactive';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';
import Link from 'src/components/Controls/Link.vue';
import Text from 'src/components/Controls/Text.vue';
import Data from 'src/components/Controls/Data.vue';
import { ItemEnquiry as ItemEnquiryType } from 'models/baseModels/ItemEnquiry/ItemEnquiry';
import { ModelNameEnum } from 'models/types';
import { DocValueMap } from 'fyo/core/types';

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string): void;
}>();

const ItemEnquiry = ref<any>({});

async function updateCustomerContact(customer: string) {
  ItemEnquiry.value.contact =
    ((await fyo.getValue('Party', customer, 'phone')) as string) || '';
}

async function submitForm() {
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
}

function clearValues() {
  ItemEnquiry.value = {};
}

function closeModal() {
  clearValues();
  emit('toggleModal', 'ItemEnquiry');
}
</script>
