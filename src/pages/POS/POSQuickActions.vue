<template>
  <div class="flex items-center gap-2">
    <!-- View Toggle -->
    <div class="relative group">
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all"
        @click="toggleItemsView"
      >
        <LucideIcon
          :name="tableView ? 'layout-grid' : 'list'"
          class="w-5 h-5 text-foreground/70"
        />
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ tableView ? t`Grid View` : t`List View` }}
        </span>
      </div>
    </div>

    <!-- Invoice List -->
    <div class="relative group">
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all font-bold"
        @click="() => $emit('emitRouteToSinvList')"
      >
        <LucideIcon name="receipt" class="w-5 h-5 text-foreground/70" />
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ t`Invoice History` }}
        </span>
      </div>
    </div>

    <!-- Loyalty -->
    <div
      v-if="
        fyo.singles.AccountingSettings?.enableLoyaltyProgram && loyaltyProgram
      "
      class="relative group"
    >
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md border border-gray-100 dark:border-gray-800 transition-all relative"
        :class="
          loyaltyPoints && sinvDoc?.party && sinvDoc?.items?.length
            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            : 'bg-gray-50 dark:bg-gray-890 text-gray-400 dark:text-gray-500 grayscale cursor-not-allowed'
        "
        @click="openLoyaltyModal"
      >
        <LucideIcon name="award" class="w-5 h-5" />
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ t`Loyalty Rewards` }}
        </span>
      </div>
    </div>

    <!-- Coupons -->
    <div
      v-if="fyo.singles.AccountingSettings?.enableCouponCode"
      class="relative group"
    >
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md border border-gray-100 dark:border-gray-800 transition-all relative"
        :class="
          sinvDoc?.party && sinvDoc?.items?.length
            ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
            : 'bg-gray-50 dark:bg-gray-890 text-gray-400 dark:text-gray-500 grayscale cursor-not-allowed'
        "
        @click="openCouponModal"
      >
        <LucideIcon name="ticket" class="w-5 h-5" />
        <Badge
          v-if="appliedCouponsCount > 0"
          class="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 bg-green-500 text-white border-2 border-background flex items-center justify-center text-[8px] font-semibold"
        >
          {{ appliedCouponsCount }}
        </Badge>
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ t`Coupons & Promos` }}
        </span>
      </div>
    </div>

    <!-- Price List -->
    <div
      v-if="fyo.singles.AccountingSettings?.enablePriceList"
      class="relative group"
    >
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all"
        @click="$emit('toggleModal', 'PriceList')"
      >
        <LucideIcon name="tags" class="w-5 h-5 text-foreground/70" />
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ t`Price Lists` }}
        </span>
      </div>
    </div>

    <!-- Item Enquiry -->
    <div
      v-if="fyo.singles.AccountingSettings?.enableItemEnquiry"
      class="relative group"
    >
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-primary"
        @click="$emit('toggleModal', 'ItemEnquiry')"
      >
        <LucideIcon name="help-circle" class="w-5 h-5" />
      </UIButton>
      <div
        class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50"
      >
        <span
          class="text-[10px] font-semibold normal-case tracking-normal text-primary dark:text-primary"
        >
          {{ t`Item Inquiry` }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { showToast } from 'src/utils/interactive';

export default defineComponent({
  name: 'POSQuickActions',
  components: {
    LucideIcon,
  },
  props: {
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
  setup() {
    return {
      fyo,
      t,
    };
  },
  data() {
    return {
      tableView: true,
    };
  },
  methods: {
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
