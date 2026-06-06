<template>
  <view class="relative group">
    <view
      class="bg-surface p-1.5 rounded-md cursor-pointer"
      @tap="toggleItemsView"
    >
      <LucideIcon
        :name="tableView ? 'grid' : 'list'"
        class="w-5 h-5 text-main"
      />
    </view>
    <text
      class="p-2 mb-2 w-20 absolute bottom-full left-1/2 transform -translate-x-1/2 text-center opacity-0 bg-surface text-main text-xs rounded-md transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ tableView ? t`Grid View` : t`List View` }}
    </text>
  </view>

  <view class="relative group">
    <view
      class="px-1.5 py-1 rounded-md bg-canvas-muted cursor-pointer"
      @tap="emit('emitRouteToSinvList')"
    >
      <LucideIcon name="receipt-text" :size="21" class="text-main" />
    </view>

    <text
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 rounded-md opacity-0 bg-surface text-main text-xs text-center transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ t`Sales Invoice List` }}
    </text>
  </view>

  <view
    class="relative group"
    :class="{
      hidden:
        !fyo.singles.AccountingSettings?.enableLoyaltyProgram ||
        !loyaltyProgram,
    }"
  >
    <view
      class="p-1 rounded-md bg-canvas-muted cursor-pointer"
      :class="{
        'bg-canvas-muted': loyaltyPoints,
        'opacity-50 cursor-not-allowed':
          !loyaltyPoints || !sinvDoc?.party || !sinvDoc?.items?.length,
      }"
      @tap="openLoyaltyModal"
    >
      <LucideIcon name="ticket" :size="23" class="text-main" />
    </view>

    <text
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-surface text-main text-xs rounded-md text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ t`Loyalty Program` }}
    </text>
  </view>

  <view
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enableCouponCode,
    }"
  >
    <view
      class="p-0.5 rounded-md bg-canvas-muted cursor-pointer"
      :class="{
        'opacity-50 cursor-not-allowed':
          !sinvDoc?.party || !sinvDoc?.items?.length,
      }"
      @tap="openCouponModal"
    >
      <LucideIcon name="tag" :size="25" class="text-main" />
    </view>
    <text
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-surface text-main text-xs rounded-md text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    >
      Coupon Code
    </text>
    <view
      v-if="appliedCouponsCount !== 0"
      class="h-4 w-4 p-2 absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-indicator-green-bg text-indicator-green-text rounded-full flex items-center justify-center text-xs cursor-pointer"
    >
      {{ appliedCouponsCount }}
    </view>
  </view>

  <view
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enablePriceList,
    }"
  >
    <view
      class="p-1 rounded-md bg-canvas-muted cursor-pointer"
      @tap="emit('toggleModal', 'PriceList')"
    >
      <LucideIcon name="layout-grid" :size="23" class="text-main" />
    </view>

    <text
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-surface text-main text-xs rounded-md p-2 w-28 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
      Price List
    </text>
  </view>
  <view
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enableItemEnquiry,
    }"
  >
    <view
      class="p-1 rounded-md bg-surface cursor-pointer"
      @tap="emit('toggleModal', 'ItemEnquiry')"
    >
      <LucideIcon name="search" :size="24" class="text-main" />
    </view>

    <text
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-surface text-main text-xs rounded-md p-2 w-28 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
      Item Enquiry
    </text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { fyo } from 'src/initFyo';
import { Payment } from 'models/baseModels/Payment/Payment';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';

// Define Props
const props = withDefaults(
  defineProps<{
    openAlertModal?: boolean;
    loyaltyPoints?: number;
    loyaltyProgram?: string;
    appliedCouponsCount?: number;
    sinvDoc?: SalesInvoice;
  }>(),
  {
    openAlertModal: false,
    loyaltyPoints: 0,
    loyaltyProgram: '',
    appliedCouponsCount: 0,
    sinvDoc: undefined,
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'toggleView'): void;
  (e: 'toggleModal', value: string): void;
  (e: 'emitRouteToSinvList'): void;
}>();

// Reactive State
const tableView = ref(true);

const totalQuantity = ref(0);
const totalTaxedAmount = ref(fyo.pesa(0));
const additionalDiscounts = ref(fyo.pesa(0));

const paymentDoc = ref<Partial<Payment>>({});
const itemSerialNumbers = ref({});

const transferRefNo = ref<string | undefined>(undefined);
const transferClearanceDate = ref<Date | undefined>(undefined);

// Computed Properties
const isPosShiftOpen = computed(() => {
  return !!fyo.singles.POSShift?.isShiftOpen;
});

// Methods
const setTransferRefNo = (refValue: string) => {
  transferRefNo.value = refValue;
};

const toggleItemsView = () => {
  tableView.value = !tableView.value;
  emit('toggleView');
};

const showValidationToast = (action: string, isLoyalty = false) => {
  let message = '';

  if (!props.sinvDoc?.items?.length) {
    message = t`Please add items`;
  } else if (!props.sinvDoc?.party) {
    message = t`Please select a customer`;
  } else if (isLoyalty && !props.loyaltyPoints) {
    message = t`Customer has no loyalty points to redeem`;
  }

  showToast({
    type: 'error',
    message: t`${message} before ${action}`,
  });
};

const openCouponModal = () => {
  if (!props.sinvDoc?.items?.length || !props.sinvDoc?.party) {
    showValidationToast('applying coupon');
    return;
  }
  emit('toggleModal', 'CouponCode');
};

const openLoyaltyModal = () => {
  if (
    !props.sinvDoc?.items?.length ||
    !props.sinvDoc?.party ||
    !props.loyaltyPoints
  ) {
    showValidationToast('applying loyalty points', true);
    return;
  }
  emit('toggleModal', 'LoyaltyProgram');
};

if (false) {
  console.log(totalQuantity.value);
  console.log(totalTaxedAmount.value);
  console.log(additionalDiscounts.value);
  console.log(paymentDoc.value);
  console.log(itemSerialNumbers.value);
  console.log(transferClearanceDate.value);
  console.log(setTransferRefNo);
  console.log(isPosShiftOpen.value);
}
</script>
