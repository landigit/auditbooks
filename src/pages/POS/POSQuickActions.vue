<template>
  <div class="relative group">
    <div class="bg-surface p-1.5 rounded-md" @click="toggleItemsView">
      <LucideIcon
        :name="tableView ? 'grid' : 'list'"
        class="w-5 h-5 text-main"
      />
    </div>
    <span
      class="p-2 mb-2 w-20 absolute bottom-full left-1/2 transform -translate-x-1/2 text-center opacity-0 bg-surface text-main text-xs rounded-md transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ tableView ? t`Grid View` : t`List View` }}
    </span>
  </div>

  <div class="relative group">
    <div
      class="px-1.5 py-1 rounded-md bg-canvas-muted"
      @click="() => $emit('emitRouteToSinvList')"
    >
      <LucideIcon name="receipt-text" :size="21" class="text-main" />
    </div>

    <span
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 rounded-md opacity-0 bg-surface text-main text-xs text-center transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ t`Sales Invoice List` }}
    </span>
  </div>

  <div
    class="relative group"
    :class="{
      hidden:
        !fyo.singles.AccountingSettings?.enableLoyaltyProgram ||
        !loyaltyProgram,
    }"
  >
    <div
      class="p-1 rounded-md bg-canvas-muted"
      :class="{
        'bg-canvas-muted': loyaltyPoints,
        'opacity-50 cursor-not-allowed':
          !loyaltyPoints || !sinvDoc?.party || !sinvDoc?.items?.length,
      }"
      @click="openLoyaltyModal"
    >
      <LucideIcon name="ticket" :size="23" class="text-main" />
    </div>

    <span
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-surface text-main text-xs rounded-md text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    >
      {{ t`Loyalty Program` }}
    </span>
  </div>

  <div
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enableCouponCode,
    }"
  >
    <div
      class="p-0.5 rounded-md bg-canvas-muted"
      :class="{
        'opacity-50 cursor-not-allowed':
          !sinvDoc?.party || !sinvDoc?.items?.length,
      }"
      @click="openCouponModal"
    >
      <LucideIcon name="tag" :size="25" class="text-main" />
    </div>
    <span
      class="mb-2 p-2 w-28 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-surface text-main text-xs rounded-md text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
    >
      Coupon Code
    </span>
    <div
      v-if="appliedCouponsCount !== 0"
      class="h-4 w-4 p-2 absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-indicator-green-bg text-indicator-green-text rounded-full flex items-center justify-center text-xs cursor-pointer"
    >
      {{ appliedCouponsCount }}
    </div>
  </div>

  <div
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enablePriceList,
    }"
  >
    <div
      class="p-1 rounded-md bg-canvas-muted"
      @click="$emit('toggleModal', 'PriceList')"
    >
      <LucideIcon name="layout-grid" :size="23" class="text-main" />
    </div>

    <span
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-surface text-main text-xs rounded-md p-2 w-28 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
      Price List
    </span>
  </div>
  <div
    class="relative group"
    :class="{
      hidden: !fyo.singles.AccountingSettings?.enableItemEnquiry,
    }"
  >
    <div
      class="p-1 rounded-md bg-surface"
      @click="$emit('toggleModal', 'ItemEnquiry')"
    >
      <LucideIcon name="search" :size="24" class="text-main" />
    </div>

    <span
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-surface text-main text-xs rounded-md p-2 w-28 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
    >
      Item Enquiry
    </span>
  </div>
</template>

<script lang="ts">
import { fyo } from 'src/initFyo';
import { defineComponent, PropType } from 'vue';
import { Payment } from 'models/baseModels/Payment/Payment';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';

export default defineComponent({
  name: 'POSQuickActions',
  props: {
    openAlertModal: Boolean,
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    loyaltyProgram: {
      type: String,
      default: '',
    },
    appliedCouponsCount: {
      type: Number,
      default: 0,
    },
    sinvDoc: {
      type: Object as PropType<SalesInvoice | undefined>,
      default: undefined,
    },
  },
  emits: ['toggleView', 'toggleModal', 'emitRouteToSinvList'],
  data() {
    return {
      tableView: true,

      totalQuantity: 0,
      totalTaxedAmount: fyo.pesa(0),
      additionalDiscounts: fyo.pesa(0),

      paymentDoc: {} as Payment,
      itemSerialNumbers: {},

      transferRefNo: undefined as string | undefined,
      transferClearanceDate: undefined as Date | undefined,
    };
  },
  computed: {
    isPosShiftOpen: () => !!fyo.singles.POSShift?.isShiftOpen,
  },
  methods: {
    setTransferRefNo(ref: string) {
      this.transferRefNo = ref;
    },
    toggleItemsView() {
      this.tableView = !this.tableView;
      this.$emit('toggleView');
    },
    showValidationToast(action: string, isLoyalty = false) {
      let message = '';

      if (!this.sinvDoc?.items?.length) {
        message = t`Please add items`;
      } else if (!this.sinvDoc?.party) {
        message = t`Please select a customer`;
      } else if (isLoyalty && !this.loyaltyPoints) {
        message = t`Customer has no loyalty points to redeem`;
      }

      showToast({
        type: 'error',
        message: t`${message} before ${action}`,
      });
    },
    openCouponModal() {
      if (!this.sinvDoc?.items?.length || !this.sinvDoc?.party) {
        this.showValidationToast('applying coupon');
        return;
      }
      this.$emit('toggleModal', 'CouponCode');
    },
    openLoyaltyModal() {
      if (
        !this.sinvDoc?.items?.length ||
        !this.sinvDoc?.party ||
        !this.loyaltyPoints
      ) {
        this.showValidationToast('applying loyalty points', true);
        return;
      }
      this.$emit('toggleModal', 'LoyaltyProgram');
    },
  },
});
</script>
