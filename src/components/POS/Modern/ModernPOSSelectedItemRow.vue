<template>
  <view>
    <lucide-icon
      :name="isExapanded ? 'chevron-up' : 'chevron-down'"
      class="w-4 h-4 inline-flex text-main"
      @tap="toggleExpand"
    />
  </view>

  <view class="relative" @tap="toggleExpand">
    <Link
      :df="{
        fieldname: 'item',
        fieldtype: 'Data',
        label: t`Item`,
      }"
      :class="row.isFreeItem ? 'mt-2' : ''"
      size="small"
      :border="false"
      :value="row.item"
      :read-only="true"
    />
    <text
      v-if="row.isFreeItem"
      class="absolute flex top-0 font-medium text-xs ml-2 text-indicator-green-text"
      style="font-size: 0.6rem"
    >
      {{ row.pricingRule }}
    </text>
  </view>

  <Int
    :df="{
      fieldname: 'quantity',
      fieldtype: 'Int',
      label: t`Quantity`,
    }"
    size="small"
    :border="false"
    :value="row.quantity"
    :read-only="true"
  />

  <Currency
    :df="{
      fieldtype: 'Currency',
      fieldname: 'rate',
      label: t`Rate`,
    }"
    size="small"
    :border="false"
    :value="row.rate"
    :read-only="true"
  />

  <Currency
    :df="{
      fieldtype: 'Currency',
      fieldname: 'amount',
      label: t`Amount`,
    }"
    size="small"
    :border="false"
    :value="row.amount"
    :read-only="true"
  />

  <view class="flex justify-center">
    <lucide-icon
      name="trash"
      class="w-4 text-xl text-error"
      @tap="removeAddedItem(row)"
    />
  </view>

  <view></view>

  <template v-if="isExapanded">
    <view class="rounded-md grid grid-cols-4 my-3" style="width: 27vw">
      <view class="px-4 col-span-2">
        <Float
          :df="{
            fieldname: 'quantity',
            fieldtype: 'Float',
            label: t`Quantity`,
          }"
          @tap="handleOpenKeyboard(row, 'quantity')"
          size="medium"
          :min="0"
          :border="true"
          :show-label="true"
          :value="row.quantity"
          :read-only="isReadOnly"
        />
      </view>

      <view class="px-4 col-span-2">
        <Link
          v-if="isUOMConversionEnabled"
          :df="{
            fieldname: 'transferUnit',
            fieldtype: 'Link',
            target: 'UOM',
            label: t`Transfer Unit`,
          }"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.transferUnit"
          :read-only="isReadOnly"
        />
      </view>

      <view class="px-4 pt-6 col-span-2">
        <Int
          v-if="isUOMConversionEnabled"
          :df="{
            fieldtype: 'Int',
            fieldname: 'transferQuantity',
            label: t`Transfer Quantity`,
          }"
          @tap="!isReadOnly && handleOpenKeyboard(row, 'transferQuantity')"
          size="medium"
          :border="true"
          :show-label="true"
          :value="row.transferQuantity"
          :read-only="isReadOnly"
        />
      </view>
      <view class="px-4 pt-6 col-span-2">
        <Currency
          :df="{
            fieldtype: 'Currency',
            fieldname: 'rate',
            label: t`Rate`,
          }"
          @tap="!isReadOnly && handleOpenKeyboard(row, 'rate')"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.rate"
          :read-only="isReadOnly"
        />
      </view>
      <view class="px-4 col-span-2 mt-5">
        <Currency
          v-if="isDiscountingEnabled"
          :df="{
            fieldtype: 'Currency',
            fieldname: 'discountAmount',
            label: 'Discount Amount',
          }"
          @tap="handleOpenKeyboard(row, 'itemDiscountAmount')"
          class="col-span-2"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.itemDiscountAmount"
          :read-only="(row.itemDiscountPercent as number) > 0 || isReadOnly"
        />
      </view>

      <view class="px-4 col-span-2 mt-5">
        <Float
          v-if="isDiscountingEnabled"
          :df="{
            fieldtype: 'Float',
            fieldname: 'itemDiscountPercent',
            label: t`Discount Percent`,
          }"
          @tap="handleOpenKeyboard(row, 'itemDiscountPercent')"
          size="medium"
          :show-label="true"
          :border="true"
          :value="row.itemDiscountPercent"
          :read-only="!row.itemDiscountAmount?.isZero() || isReadOnly"
        />
      </view>

      <view
        v-if="row.links?.item && row.links?.item.hasBatch"
        class="px-4 pt-6 col-span-2"
      >
        <Link
          :df="{
            fieldname: 'batch',
            fieldtype: 'Link',
            target: 'Batch',
            label: t`Batch`,
            filters: { item: row.item as string },
          }"
          size="medium"
          :value="row.batch"
          :border="true"
          :show-label="true"
          :read-only="false"
          @change="(value: string) => setBatch(value)"
        />
      </view>

      <view
        v-if="row.links?.item && row.links?.item.hasBatch"
        class="px-4 pt-6 col-span-2"
      >
        <Float
          :df="{
            fieldname: 'availableQtyInBatch',
            fieldtype: 'Float',
            label: t`Qty in Batch`,
          }"
          size="medium"
          :min="0"
          :value="availableQtyInBatch"
          :show-label="true"
          :border="true"
          :read-only="true"
          :text-right="true"
        />
      </view>

      <view v-if="hasSerialNumber" class="px-4 pt-6 col-span-4">
        <Text
          :df="{
            label: t`Serial Number`,
            fieldtype: 'Text',
            fieldname: 'serialNumber',
          }"
          :value="row.serialNumber"
          :show-label="true"
          :border="true"
          :required="hasSerialNumber"
          @change="(value: string) => setSerialNumber(value)"
        />
      </view>
    </view>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from "vue";
import Currency from "src/components/Controls/Currency.vue";
import Float from "src/components/Controls/Float.vue";
import Int from "src/components/Controls/Int.vue";
import Link from "src/components/Controls/Link.vue";
import Text from "src/components/Controls/Text.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import { SalesInvoiceItem } from "models/baseModels/SalesInvoiceItem/SalesInvoiceItem";
import { validateSerialNumberCount } from "src/utils/pos";

const props = defineProps({
  row: { type: SalesInvoiceItem, required: true },
  batchAdded: { type: Boolean, default: false },
  expandedBatchId: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits([
  "toggleModal",
  "runSinvFormulas",
  "selectedRow",
  "applyPricingRule",
  "setExpandedBatchId",
]);

const isDiscountingEnabled = inject("isDiscountingEnabled") as boolean;
const itemSerialNumbers = inject("itemSerialNumbers") as {
  [item: string]: string;
};

const isExapanded = ref(false);
const availableQtyInBatch = ref(0);

const isUOMConversionEnabled = computed(() => {
  return !!fyo.singles.InventorySettings?.enableUomConversions;
});

const hasSerialNumber = computed(() => {
  return !!(props.row.links?.item && props.row.links?.item.hasSerialNumber);
});

const isReadOnly = computed(() => {
  return props.row.isFreeItem;
});

watch(
  () => props.expandedBatchId,
  (newVal) => {
    if (newVal !== props.row.name) {
      isExapanded.value = false;
    }
  },
);

watch(
  () => props.row.batch,
  async (newBatch) => {
    if (newBatch) {
      availableQtyInBatch.value = await getAvailableQtyInBatch();
      isExapanded.value = true;
      emit("setExpandedBatchId", props.row.name);
    }
  },
  { immediate: true },
);

function toggleExpand() {
  if (isExapanded.value) {
    isExapanded.value = false;
    emit("setExpandedBatchId", undefined);
  } else {
    isExapanded.value = true;
    emit("setExpandedBatchId", props.row.name);
  }
}

function handleOpenKeyboard(row: SalesInvoiceItem, field: string) {
  if (isReadOnly.value) {
    return;
  }

  emit("selectedRow", row, field);
  emit("toggleModal", "Keyboard");
}

async function getAvailableQtyInBatch(): Promise<number> {
  if (!props.row.batch) {
    return 0;
  }

  return (
    (await fyo.db.getStockQuantity(
      props.row.item as string,
      undefined,
      undefined,
      undefined,
      props.row.batch,
    )) ?? 0
  );
}

async function setBatch(batch: string) {
  props.row.set("batch", batch);
  availableQtyInBatch.value = await getAvailableQtyInBatch();
}

function setSerialNumber(serialNumber: string) {
  if (!serialNumber) {
    return;
  }
  itemSerialNumbers[props.row.item as string] = serialNumber;

  validateSerialNumberCount(
    serialNumber,
    props.row.quantity ?? 0,
    props.row.item!,
  );
}

async function removeAddedItem(row: SalesInvoiceItem) {
  props.row.parentdoc?.remove("items", row?.idx as number);

  if (!row.isFreeItem) {
    emit("applyPricingRule");
  }
}
</script>
