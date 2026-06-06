<template>
  <Modal class="h-auto w-96" :set-close-listener="false">
    <text class="text-center font-semibold py-3">Apply Coupon Code</text>
    <view class="px-10">
      <view class="border-b border-border"   />
      <text v-if="appliedCoupons.length" class="text-xs m-2 text-description">
        {{ t`Applied Coupon Codes` }}
      </text>
      <view
        v-if="appliedCoupons.length"
        class="overflow-y-auto mt-2 custom-scroll custom-scroll-thumb2"
        :style="{ height: appliedCoupons.length >= 2 ? '11vh' : '8vh' }"
      >
        <Row
          v-for="(coupon, index) in appliedCoupons"
          :key="index"
          :ratio="ratio"
          :border="true"
          class="border-b border-l border-r border-border relative group h-coupon-mid hover:bg-surface-hover bg-surface items-center justify-center"
        >
          <view class="flex flex-row w-full items-center">
            <view class="flex flex-row">
              <FormControl
                v-for="df in tableFields"
                :key="df.fieldname"
                size="large"
                class="w-full"
                :df="df"
                :value="(coupon as any)[df.fieldname]"
                :read-only="true"
              />
            </view>
          </view>
          <view class="absolute right-3">
            <lucide-icon
              name="trash"
              class="w-4 text-xl text-error cursor-pointer"
              @tap="removeAppliedCoupon(coupon as any)"
            />
          </view>
        </Row>
      </view>

      <view
        v-if="coupons.fieldMap"
        class="flex justify-center"
        :class="appliedCoupons.length ? 'pb-0 pt-4' : 'pt-10'"
      >
        <view class="w-80" :class="appliedCoupons.length ? 'pb-4' : 'pb-10'">
          <Link
            v-if="coupons.fieldMap"
            class="flex-shrink-0"
            :show-label="true"
            :border="true"
            :value="couponCode"
            :focus-input="true"
            :df="coupons.fieldMap.coupons"
            @change="updateCouponCode"
          />
        </view>
      </view>

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-2">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-green-bg"
            style="padding: 1.35rem"
            :disabled="validationError"
            @tap="setCouponCode()"
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
            @tap="cancelApplyCouponCode()"
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
import { ref, computed, inject } from 'vue';
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { showToast } from 'src/utils/interactive';
import { AppliedCouponCodes } from 'models/baseModels/AppliedCouponCodes/AppliedCouponCodes';
import Link from 'src/components/Controls/Link.vue';
import { ModelNameEnum } from 'models/types';
import { validateCouponCode } from 'models/helpers';
import { Field } from 'schemas/types';
import FormControl from 'src/components/Controls/FormControl.vue';
import Row from 'src/components/Row.vue';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

// Define Emits
const emit = defineEmits<{
  (e: 'setCouponsCount', value: number): void;
  (e: 'toggleModal', value: string): void;
  (e: 'applyPricingRule'): void;
}>();

// App Store / Context Injections
const sinvDoc = inject('sinvDoc') as SalesInvoice;
const coupons = inject('coupons') as AppliedCouponCodes;
const appliedCoupons = inject('appliedCoupons') as AppliedCouponCodes[];

// Reactive State
const validationError = ref(false);
const couponCode = ref('');

// Computed Properties
const ratio = computed(() => {
  return [1, 0.1, 1, 0.7];
});

const tableFields = computed<Field[]>(() => {
  return [
    {
      fieldname: 'coupons',
      fieldtype: 'Link',
      required: true,
      readOnly: true,
    },
  ] as Field[];
});

// Methods
const updateCouponCode = async (value: string | Event) => {
  try {
    if (!value) {
      return;
    }
    validationError.value = false;

    if (value instanceof Event) {
      value = (value.target as HTMLInputElement).value;
    }

    couponCode.value = value as string;
    const appliedCouponCodes = fyo.doc.getNewDoc(
      ModelNameEnum.AppliedCouponCodes
    );

    await validateCouponCode(
      appliedCouponCodes as AppliedCouponCodes,
      couponCode.value,
      sinvDoc
    );

    await sinvDoc.append('coupons', { coupons: couponCode.value });

    emit('applyPricingRule');
    couponCode.value = '';
    validationError.value = false;
  } catch (error) {
    validationError.value = true;

    showToast({
      type: 'error',
      message: t`${error as string}`,
    });
  }
};

const setCouponCode = () => {
  emit('toggleModal', 'CouponCode');
};

const removeAppliedCoupon = async (coupon: AppliedCouponCodes) => {
  sinvDoc?.items?.map((item: InvoiceItem) => {
    item.itemDiscountAmount = fyo.pesa(0);
    item.itemDiscountPercent = 0;
    item.setItemDiscountAmount = false;
  });

  await coupon?.parentdoc?.remove('coupons', coupon.idx as number);

  emit('applyPricingRule');
  emit('setCouponsCount', (coupons as any)?.length || 0);
};

const cancelApplyCouponCode = () => {
  couponCode.value = '';
  emit('toggleModal', 'CouponCode');
};
</script>
