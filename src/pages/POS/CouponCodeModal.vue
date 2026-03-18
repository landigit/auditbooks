<template>
  <Dialog :open="true" @update:open="cancelApplyCouponCode">
    <DialogContent
      class="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none"
    >
      <div
        class="bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95"
      >
        <!-- Header -->
        <div
          class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 flex items-center justify-between"
        >
          <div class="flex flex-col gap-1">
            <h3
              class="text-xs font-semibold normal-case tracking-[0.3em] text-primary dark:text-primary flex items-center gap-2"
            >
              <LucideIcon name="ticket" class="w-4 h-4 text-primary" />
              {{ t`Coupon Codes` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Manage discounts and promotions` }}
            </p>
          </div>
        </div>

        <div class="p-8 space-y-6">
          <!-- Applied Coupons List -->
          <div v-if="appliedCoupons.length" class="space-y-3">
            <h4
              class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
            >
              {{ t`Applied Coupons` }}
            </h4>
            <div class="space-y-2">
              <div
                v-for="(coupon, index) in appliedCoupons"
                :key="index"
                class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 group hover:bg-primary/5 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"
                  >
                    <LucideIcon name="tag" class="w-4 h-4 text-primary" />
                  </div>
                  <span class="font-bold text-sm tracking-tight normal-case">{{
                    coupon.coupons
                  }}</span>
                </div>
                <UIButton
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 rounded-md text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                  @click="removeAppliedCoupon(coupon)"
                >
                  <LucideIcon name="trash-2" class="w-4 h-4" />
                </UIButton>
              </div>
            </div>
          </div>

          <!-- New Coupon Input -->
          <div class="space-y-4 pt-2">
            <div class="relative group">
              <label
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 mb-2 block px-1"
                >{{ t`Add New Coupon` }}</label
              >
              <div class="relative">
                <Input
                  v-model="couponCode"
                  type="text"
                  :placeholder="t`Enter coupon code...`"
                  class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all pl-12 font-bold normal-case tracking-normal"
                  @keydown.enter="handleCouponApply"
                />
                <LucideIcon
                  name="plus-circle"
                  class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary/50 transition-colors"
                />
              </div>
            </div>

            <div
              v-if="!appliedCoupons.length"
              class="bg-primary/5 rounded-lg p-4 border border-primary/10 flex items-center gap-4"
            >
              <div
                class="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center"
              >
                <LucideIcon name="info" class="w-5 h-5 text-primary/40" />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium italic">
                {{ t`No coupons applied to this invoice yet.` }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
        >
          <UIButton
            variant="outline"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
            @click="cancelApplyCouponCode"
          >
            {{ t`Close` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            :disabled="!couponCode"
            @click="handleCouponApply"
          >
            {{ t`Apply Discount` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import {
  Dialog,
  DialogContent,
  Input,
  Badge,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { AppliedCouponCodes } from 'models/baseModels/AppliedCouponCodes/AppliedCouponCodes';
import { validateCouponCode } from 'models/helpers';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';

export default defineComponent({
  name: 'CouponCodeModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    LucideIcon,
  },
  emits: ['setCouponsCount', 'toggleModal', 'applyPricingRule'],
  setup() {
    return {
      t,
      fyo,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
      coupons: inject('coupons') as AppliedCouponCodes,
      appliedCoupons: inject('appliedCoupons') as AppliedCouponCodes[],
    };
  },
  data() {
    return {
      couponCode: '',
      validationError: false,
    };
  },
  methods: {
    async handleCouponApply() {
      if (!this.couponCode) return;

      try {
        const appliedCouponCodes = fyo.doc.getNewDoc(
          ModelNameEnum.AppliedCouponCodes
        );

        await validateCouponCode(
          appliedCouponCodes as AppliedCouponCodes,
          this.couponCode,
          this.sinvDoc
        );

        await this.sinvDoc.append('coupons', { coupons: this.couponCode });

        this.$emit('applyPricingRule');
        showToast({ type: 'success', message: t`Coupon applied successfully` });
        this.couponCode = '';
        this.validationError = false;
      } catch (error) {
        this.validationError = true;
        showToast({
          type: 'error',
          message: t`${error as string}`,
        });
      }
    },
    async removeAppliedCoupon(coupon: AppliedCouponCodes) {
      try {
        this.sinvDoc?.items?.map((item: InvoiceItem) => {
          item.itemDiscountAmount = fyo.pesa(0);
          item.itemDiscountPercent = 0;
          item.setItemDiscountAmount = false;
        });

        await coupon?.parentdoc?.remove('coupons', coupon.idx as number);

        this.$emit('applyPricingRule');
        this.$emit('setCouponsCount', this.appliedCoupons?.length);
        showToast({ type: 'success', message: t`Coupon removed` });
      } catch (error) {
        showToast({ type: 'error', message: t`Failed to remove coupon` });
      }
    },
    cancelApplyCouponCode() {
      this.couponCode = '';
      this.$emit('toggleModal', 'CouponCode');
    },
  },
});
</script>
