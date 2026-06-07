<template>
  <lucide-icon
    :name="isExapanded ? 'chevron-up' : 'chevron-down'"
    class="w-4 h-4 inline-flex cursor-pointer text-main"
    @tap="toggleExpand"
  />

  <view class="relative" @tap="toggleExpandAndEmit">
    <Link
      class="pt-2"
      :df="{
        fieldname: 'item',
        fieldtype: 'Data',
        label: 'item',
      }"
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

  <view class="flex items-center">
    <Int
      :df="{
        fieldname: 'quantity',
        fieldtype: 'Int',
        label: 'Quantity',
      }"
      size="small"
      :border="false"
      :value="getDisplayTransferQuantity()"
      :read-only="true"
    />
    <view class="flex flex-col ml-1">
      <lucide-icon
        name="chevron-up"
        class="w-3 h-3 cursor-pointer hover:text-indicator-blue-text text-main"
        @tap="adjustQuantity(1)"
      />
      <lucide-icon
        name="chevron-down"
        class="w-3 h-3 cursor-pointer hover:text-indicator-blue-text text-main"
        @tap="adjustQuantity(-1)"
      />
    </view>
  </view>

  <Link
    class="ml-5"
    :df="{
      fieldname: 'transferUnit',
      fieldtype: 'Data',
      label: 'Unit',
    }"
    size="small"
    :border="false"
    :value="row.transferUnit || row.unit"
    :read-only="true"
  />

  <Currency
    :df="{
      fieldtype: 'Currency',
      fieldname: 'rate',
      label: 'rate',
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

  <view class="px-4">
    <lucide-icon
      name="trash"
      class="w-4 text-xl text-indicator-red-text"
      @tap="removeAddedItem(row)"
    />
  </view>

  <view></view>

  <template v-if="isExapanded">
    <view class="px-4 pt-6 col-span-1">
      <Int
        v-if="isUOMConversionEnabled"
        :df="{
          fieldtype: 'Int',
          fieldname: 'transferQuantity',
          label: 'Transfer Quantity',
        }"
        size="medium"
        :border="true"
        :show-label="true"
        :value="getDisplayTransferQuantity()"
        @change="(value: string) => row.set('transferQuantity', value)"
        :read-only="isReadOnly"
      />
    </view>

    <view class="px-4 pt-6 col-span-2">
      <AutoComplete
        v-if="isUOMConversionEnabled && transferUnitOptions.length"
        :key="row.item"
        :df="{
          fieldtype: 'AutoComplete',
          fieldname: 'transferUnit',
          label: t`Transfer Unit`,
          options: transferUnitOptions,
        }"
        class="flex-1"
        :show-label="true"
        :border="true"
        :value="row.transferUnit ?? ''"
        @change="(value: string) => row.set('transferUnit', value)"
        :read-only="isReadOnly"
      />
    </view>

    <view class="px-4 pt-6 col-span-2">
      <Float
        :df="{
          fieldname: 'quantity',
          fieldtype: 'Float',
          label: 'Quantity',
        }"
        size="medium"
        :min="0"
        :border="true"
        :show-label="true"
        :value="row.quantity"
        @change="(value: number) => setQuantity(value)"
        :read-only="isUOMConversionEnabled"
      />
    </view>

    <view></view>
    <view></view>

    <view class="px-4 pt-6">
      <Currency
        :df="{
          fieldtype: 'Currency',
          fieldname: 'rate',
          label: 'Rate',
        }"
        size="medium"
        :show-label="true"
        :border="true"
        :value="row.rate"
        :read-only="isRateReadOnly()"
        @change="(value: Money) => setRate((row.rate = value))"
      />
    </view>
    <view class="px-6 pt-6 col-span-2">
      <Currency
        v-if="isDiscountingEnabled"
        :df="{
          fieldtype: 'Currency',
          fieldname: 'discountAmount',
          label: 'Discount Amount',
        }"
        class="col-span-2"
        size="medium"
        :show-label="true"
        :border="true"
        :value="row.itemDiscountAmount"
        :read-only="isDiscountsReadOnly((row.itemDiscountPercent as number) > 0)"
        @change="(value: number) => setItemDiscount('amount', value)"
      />
    </view>

    <view class="px-4 pt-6 col-span-2">
      <Float
        v-if="isDiscountingEnabled"
        :df="{
          fieldtype: 'Float',
          fieldname: 'itemDiscountPercent',
          label: 'Discount Percent',
        }"
        size="medium"
        :show-label="true"
        :border="true"
        :value="row.itemDiscountPercent"
        :read-only="isDiscountsReadOnly(!row.itemDiscountAmount?.isZero())"
        @change="(value: number) => setItemDiscount('percent', value)"
      />
    </view>

    <view class=""></view>

    <view v-if="row.links?.item && row.links?.item.hasBatch" class="pl-6 px-4 pt-6 col-span-2">
      <Link
        :df="{
          fieldname: 'batch',
          fieldtype: 'Link',
          target: 'Batch',
          label: t`Batch`,
          filters: { item: row.item as string },
        }"
        :value="row.batch"
        :border="true"
        :show-label="true"
        :read-only="false"
        @change="(value: string) => setBatch(value)"
      />
    </view>

    <view v-if="showAvlQuantityInBatch" class="px-5 pt-6 col-span-2">
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

    <view v-if="hasSerialNumber" class="px-6 pt-6 col-span-3">
      <Text
        :df="{
          label: t`Serial Number`,
          fieldtype: 'Text',
          fieldname: 'serialNumber',
        }"
        :value="itemSerialNumbers[row.item as string] || row.serialNumber"
        :show-label="true"
        :border="true"
        :required="hasSerialNumber"
        @change="(value: string) => setSerialNumber(value)"
      />
    </view>
  </template>
</template>

<script setup lang="ts">
import { ref, inject, watch, computed, onMounted, nextTick } from "vue";
import Currency from "src/components/Controls/Currency.vue";
import Float from "src/components/Controls/Float.vue";
import Int from "src/components/Controls/Int.vue";
import Link from "src/components/Controls/Link.vue";
import Text from "src/components/Controls/Text.vue";
import AutoComplete from "src/components/Controls/AutoComplete.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import { SalesInvoiceItem } from "models/baseModels/SalesInvoiceItem/SalesInvoiceItem";
import { Money } from "pesa";
import { DiscountType } from "../types";
import { validateSerialNumberCount } from "src/utils/pos";
import { getItemVisibility, validateQty } from "models/helpers";
import { InvoiceItem } from "models/baseModels/InvoiceItem/InvoiceItem";
import { SalesInvoice } from "models/baseModels/SalesInvoice/SalesInvoice";
import { showToast } from "src/utils/interactive";
import { ModelNameEnum } from "models/types";
import { getExistingActiveSerialNumbersForItem } from "models/inventory/helpers";

const props = defineProps({
  row: { type: SalesInvoiceItem, required: true },
  batchAdded: { type: Boolean, default: false },
  expandedBatchId: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits([
  "runSinvFormulas",
  "applyPricingRule",
  "selectedRow",
  "setExpandedBatchId",
]);

const isDiscountingEnabled = inject("isDiscountingEnabled") as boolean;
const itemSerialNumbers = inject("itemSerialNumbers") as {
  [item: string]: string;
};

const isExapanded = ref(false);

const availableQtyInBatch = ref(0);
const itemVisibility = ref("");

const profileDiscountSetting = ref<boolean | null>(null);
const profileRateSetting = ref<boolean | null>(null);
const transferUnitOptions = ref<Array<{ label: string; value: string }>>([]);
const isMountedRef = ref(false);
const pendingTransferUnitChange = ref(false);
const transferUnitChangeOldQty = ref(0);

const isUOMConversionEnabled = computed(
  () => !!fyo.singles.InventorySettings?.enableUomConversions,
);

const hasSerialNumber = computed(
  () => !!(props.row.links?.item && props.row.links?.item.hasSerialNumber),
);

const isReadOnly = computed(() => props.row.isFreeItem);

const showAvlQuantityInBatch = computed(
  () => !!(props.row.links?.item && props.row.links?.item.hasBatch && itemVisibility.value),
);

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

watch(
  () => props.row.item,
  async (newItem) => {
    if (newItem) {
      await updateTransferUnitOptions();
    } else {
      transferUnitOptions.value = [];
    }
  },
  { immediate: true },
);

watch(
  () => props.row.quantity,
  async (newQuantity, oldQuantity) => {
    if (
      hasSerialNumber.value &&
      newQuantity &&
      newQuantity > 0 &&
      isMountedRef.value &&
      newQuantity !== oldQuantity
    ) {
      await fetchSerialNumbers(false, true);
    }
  },
);

watch(
  () => props.row.transferQuantity,
  async (newTransferQuantity, oldTransferQuantity) => {
    if (pendingTransferUnitChange.value && newTransferQuantity !== transferUnitChangeOldQty.value) {
      pendingTransferUnitChange.value = false;
      transferUnitChangeOldQty.value = 0;

      await fetchSerialNumbers(true, false);
      return;
    }

    if (
      isUOMConversionEnabled.value &&
      hasSerialNumber.value &&
      newTransferQuantity &&
      newTransferQuantity > 0 &&
      isMountedRef.value &&
      newTransferQuantity !== oldTransferQuantity &&
      !pendingTransferUnitChange.value
    ) {
      await fetchSerialNumbers(false, false);
    }
  },
);

watch(
  () => props.row.transferUnit,
  async (newTransferUnit, oldTransferUnit) => {
    if (
      isUOMConversionEnabled.value &&
      hasSerialNumber.value &&
      newTransferUnit &&
      oldTransferUnit &&
      newTransferUnit !== oldTransferUnit &&
      isMountedRef.value
    ) {
      delete itemSerialNumbers[props.row.item as string];
      await props.row.set("serialNumber", "");

      pendingTransferUnitChange.value = true;
      transferUnitChangeOldQty.value = props.row.transferQuantity ?? 0;
    }
  },
);

onMounted(async () => {
  const posProfileName = fyo.singles.POSSettings?.posProfile;

  if (posProfileName) {
    const profile = await fyo.doc.getDoc(ModelNameEnum.POSProfile, posProfileName as string);

    profileDiscountSetting.value =
      !!profile?.canEditDiscount || !!fyo.singles.POSSettings?.canEditDiscount;

    profileRateSetting.value = !!profile?.canChangeRate || !!fyo.singles.POSSettings?.canChangeRate;

    itemVisibility.value = await getItemVisibility(fyo);
  } else {
    profileDiscountSetting.value = !!fyo.singles.POSSettings?.canEditDiscount;

    profileRateSetting.value = !!fyo.singles.POSSettings?.canChangeRate;
    itemVisibility.value = await getItemVisibility(fyo);
  }

  await nextTick();

  isMountedRef.value = true;

  if (hasSerialNumber.value) {
    await fetchSerialNumbers();
  }
});

function toggleExpand() {
  if (isExapanded.value) {
    isExapanded.value = false;
    emit("setExpandedBatchId", undefined);
  } else {
    isExapanded.value = true;
    emit("setExpandedBatchId", props.row.name);
  }
}

function toggleExpandAndEmit() {
  toggleExpand();
  emit("selectedRow", props.row);
}

function adjustQuantity(change: number) {
  let currentQuantity = props.row.quantity ?? 1;
  let newQuantity = currentQuantity + change;

  if (newQuantity === 0) {
    return;
  }

  setQuantity(newQuantity);
}

async function updateTransferUnitOptions() {
  if (!props.row.item) {
    transferUnitOptions.value = [];
    return;
  }

  const itemDoc = await fyo.doc.getDoc("Item", props.row.item as string);

  const conversions = (itemDoc?.uomConversions ?? []) as Array<{
    uom: string;
    conversionFactor: number;
  }>;

  const allowedUoms = new Set<string>();

  if (typeof itemDoc?.unit === "string") {
    allowedUoms.add(itemDoc.unit);
  }

  for (const c of conversions) {
    if (typeof c.uom === "string") {
      allowedUoms.add(c.uom);
    }
  }

  transferUnitOptions.value = [...allowedUoms].map((uom) => ({
    label: uom,
    value: uom,
  }));
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

function getDisplayTransferQuantity() {
  const transferQty = props.row.transferQuantity;

  if (!isUOMConversionEnabled.value) {
    return transferQty;
  }

  const hasValidQuantity = transferQty && transferQty;

  if (props.row.isReturn && hasValidQuantity) {
    return -Math.abs(transferQty);
  }

  return transferQty;
}

function isDiscountsReadOnly(isValidDiscount: boolean) {
  const canEditDiscount = profileDiscountSetting.value;

  return props.row.isFreeItem || !canEditDiscount || isValidDiscount;
}

async function setBatch(batch: string) {
  props.row.set("batch", batch);
  await getAvailableQtyInBatch();
}

function setSerialNumber(serialNumber: string) {
  if (!serialNumber) {
    return;
  }

  props.row.set("serialNumber", serialNumber);
  itemSerialNumbers[props.row.item as string] = serialNumber;

  validateSerialNumberCount(serialNumber, Math.abs(props.row.quantity ?? 0), props.row.item!);
}

async function fetchSerialNumbers(forceRefetch = false, useDirectQuantity = false) {
  if (!hasSerialNumber.value) {
    return;
  }

  let quantity = 0;
  if (useDirectQuantity) {
    quantity = Math.abs(props.row.quantity ?? 0);
  } else if (isUOMConversionEnabled.value && props.row.transferQuantity) {
    quantity = Math.abs(props.row.transferQuantity);
  } else if (props.row.quantity) {
    quantity = Math.abs(props.row.quantity);
  }

  if (quantity <= 0) {
    return;
  }

  const existingSerialNumbers = itemSerialNumbers[props.row.item as string];

  if (existingSerialNumbers && !forceRefetch) {
    const existingCount = existingSerialNumbers.split("\n").filter((s) => s.trim()).length;

    if (existingCount === quantity) {
      return;
    } else {
    }
  }

  try {
    const serialNumbers = await getExistingActiveSerialNumbersForItem(
      fyo,
      props.row.item as string,
      quantity,
    );

    if (serialNumbers) {
      await props.row.set("serialNumber", serialNumbers);
      itemSerialNumbers[props.row.item as string] = serialNumbers;
    } else {
    }
  } catch (error) {}
}

function isRateReadOnly() {
  const canChangeRate = profileRateSetting.value;
  return props.row.isFreeItem || !canChangeRate;
}

function setItemDiscount(type: DiscountType, value: Money | number) {
  if (type === "percent") {
    props.row.set("setItemDiscountAmount", false);
    props.row.set("itemDiscountPercent", value as number);
    return;
  }
  props.row.set("setItemDiscountAmount", true);
  props.row.set("itemDiscountAmount", value as Money);
}

function setRate(rate: Money) {
  props.row.setRate = rate;
  emit("runSinvFormulas");
}

async function setQuantity(quantity: number) {
  const hasManualDiscount = props.row.setItemDiscountAmount;
  const isPercentageDiscount = !hasManualDiscount && props.row.itemDiscountPercent !== 0;
  const manualDiscountAmount = props.row.itemDiscountAmount;
  const manualDiscountPercent = props.row.itemDiscountPercent;

  if (!props.row.isReturn && quantity <= 0) {
    showToast({
      type: "error",
      message: "Quantity must be greater than zero.",
      duration: "short",
    });

    quantity = props.row.quantity ?? 1;
  }

  props.row.set("quantity", quantity);

  const existingItems =
    (props.row.parentdoc as SalesInvoice).items?.filter(
      (invoiceItem: InvoiceItem) => invoiceItem.item === props.row.item && !invoiceItem.isFreeItem,
    ) ?? [];

  quantity = props.row.quantity ?? 1;

  try {
    await validateQty(props.row.parentdoc as SalesInvoice, props.row, existingItems);
  } catch (error) {
    props.row.set("quantity", quantity);

    return showToast({
      type: "error",
      message: t`${error as string}`,
      duration: "short",
    });
  }

  if (!props.row.isFreeItem) {
    emit("applyPricingRule");
    emit("runSinvFormulas");

    if (!hasManualDiscount && !isPercentageDiscount) {
      props.row.set("setItemDiscountAmount", false);
      props.row.set("itemDiscountPercent", 0);
    }

    if (hasManualDiscount) {
      props.row.set("setItemDiscountAmount", true);
      props.row.set("itemDiscountAmount", manualDiscountAmount);
    } else if (isPercentageDiscount) {
      props.row.set("setItemDiscountAmount", false);
      props.row.set("itemDiscountPercent", manualDiscountPercent);
    }
  }
}

async function removeAddedItem(row: SalesInvoiceItem) {
  props.row.parentdoc?.remove("items", row?.idx as number);
  props.row.runFormulas();
  if (!row.isFreeItem) {
    emit("applyPricingRule");
  }
}
</script>
