<template>
  <view v-if="!isLynx">
    <Modal class="w-2/6 ml-auto mr-3.5" :set-close-listener="false">
      <view
        v-if="sinvDoc.fieldMap"
        class="px-4 py-6 flex flex-col gap-6 overflow-y-auto max-h-[90vh]"
      >
        <Currency
          :df="fyo.fieldMap.PaymentFor.amount"
          :read-only="!transferAmount.isZero()"
          :border="true"
          :text-right="true"
          :value="paidAmount"
          @change="
            (amount: Money) => emit('setPaidAmount', (amount as Money).float)
          "
        />
        <view v-if="paymentMethods.length" class="grid grid-cols-2 gap-6">
          <Button
            v-for="method in paymentMethods"
            :key="method"
            class="w-full py-5 bg-surface border border-border hover:bg-surface-hover"
            @tap="setPaymentMethodAndAmount(method)"
          >
            <slot>
              <text class="uppercase text-lg text-main font-semibold">
                {{ t`${method}` }}
              </text>
            </slot>
          </Button>
        </view>
        <view
          v-else
          class="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
        >
          <text class="text-sm font-semibold text-main">{{
            t`No Payment Methods Found`
          }}</text>
          <text class="text-xs text-description text-center mt-1">
            {{ t`Please configure payment methods in settings first.` }}
          </text>
        </view>

        <view class="mt-8 grid grid-cols-2 gap-6">
          <Data
            v-show="!isPaymentMethodIsCash"
            :df="fyo.fieldMap.Payment.referenceId"
            :show-label="true"
            :border="true"
            :required="!transferAmount.isZero()"
            :read-only="false"
            :value="transferRefNo"
            @change="(value: string) => emit('setTransferRefNo', value)"
          />

          <DateField
            v-show="!isPaymentMethodIsCash"
            :df="fyo.fieldMap.Payment.clearanceDate"
            :show-label="true"
            :border="true"
            :required="!transferAmount.isZero()"
            :read-only="false"
            :value="transferClearanceDate"
            @change="(value: Date) => emit('setTransferClearanceDate', value)"
          />
        </view>

        <view class="mt-14 grid grid-cols-2 gap-6">
          <Currency
            v-show="showPaidChange"
            :df="{
              label: t`Paid Change`,
              fieldtype: 'Currency',
              fieldname: 'paidChange',
            }"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="paidChange"
          />

          <Currency
            v-show="showBalanceAmount"
            :df="{
              label: t`Balance Amount`,
              fieldtype: 'Currency',
              fieldname: 'balanceAmount',
            }"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="balanceAmount"
          />
        </view>

        <view class="grid grid-cols-2 gap-x-6 gap-y-6">
          <Currency
            :df="sinvDoc.fieldMap.netTotal"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="sinvDoc?.netTotal"
          />

          <Currency
            :df="{
              label: t`Taxes and Charges`,
              fieldtype: 'Currency',
              fieldname: 'taxesAndCharges',
            }"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="totalTaxedAmount"
          />

          <Currency
            :df="sinvDoc.fieldMap.baseGrandTotal"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="sinvDoc?.baseGrandTotal"
          />

          <Currency
            v-if="isDiscountingEnabled"
            :df="sinvDoc.fieldMap.discountAmount"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="itemDiscounts"
          />

          <Currency
            :df="sinvDoc.fieldMap.grandTotal"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="sinvDoc?.grandTotal"
          />

          <Currency
            :df="sinvDoc.fieldMap.outstandingAmount"
            :read-only="true"
            :show-label="true"
            :border="true"
            :text-right="true"
            :value="sinvDoc?.outstandingAmount"
          />
        </view>

        <view class="grid grid-cols-2 gap-4">
          <view class="col-span-1">
            <Button
              class="w-full"
              :style="{
                backgroundColor: fyo.singles.Defaults?.submitButtonColour,
              }"
              style="padding: 1.35rem"
              @tap="submitTransaction"
            >
              <slot>
                <text
                  class="uppercase text-lg text-button-primary-text font-semibold"
                >
                  {{ t`Submit` }}
                </text>
              </slot>
            </Button>
          </view>

          <view class="col-span-1">
            <Button
              class="w-full"
              :style="{
                backgroundColor: fyo.singles.Defaults?.cancelButtonColour,
              }"
              style="padding: 1.35rem"
              @tap="cancelTransaction"
            >
              <slot>
                <text
                  class="uppercase text-lg text-button-primary-text font-semibold"
                >
                  {{ t`Cancel` }}
                </text>
              </slot>
            </Button>
          </view>

          <view class="col-span-1">
            <Button
              class="w-full"
              :style="{
                backgroundColor: fyo.singles.Defaults?.payButtonColour,
              }"
              style="padding: 1.35rem"
              @tap="payTransaction"
            >
              <slot>
                <text
                  class="uppercase text-lg text-button-primary-text font-semibold"
                >
                  {{ t`Pay` }}
                </text>
              </slot>
            </Button>
          </view>

          <view class="col-span-1">
            <Button
              class="w-full"
              :style="{
                backgroundColor: fyo.singles.Defaults?.payAndPrintButtonColour,
              }"
              style="padding: 1.35rem"
              @tap="payAndPrintTransaction"
            >
              <slot>
                <text
                  class="uppercase text-lg text-button-primary-text font-semibold"
                >
                  {{ t`Pay & Print` }}
                </text>
              </slot>
            </Button>
          </view>
        </view>
      </view>
    </Modal>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Payment Modal</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import Button from 'src/components/Button.vue';
import Currency from 'src/components/Controls/Currency.vue';
import Data from 'src/components/Controls/Data.vue';
import DateField from 'src/components/Controls/Date.vue';
import Modal from 'src/components/Modal.vue';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { fyo } from 'src/initFyo';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';

// Define Emits
const emit = defineEmits<{
  (e: 'createTransaction', print?: boolean, pay?: boolean): void;
  (e: 'setPaidAmount', value: any): void;
  (e: 'setPaymentMethod', value: string): void;
  (e: 'setTransferClearanceDate', value: Date): void;
  (e: 'setTransferRefNo', value: string): void;
  (e: 'toggleModal', modal: string): void;
}>();

// App Store / Context Injections
const paidAmount = inject('paidAmount') as Money;
const paymentMethod = inject('paymentMethod') as string;
const isDiscountingEnabled = inject('isDiscountingEnabled') as boolean;
const itemDiscounts = inject('itemDiscounts') as Money;
const transferAmount = inject('transferAmount') as Money;
const sinvDoc = inject('sinvDoc') as SalesInvoice;
const transferRefNo = inject('transferRefNo') as string;
const transferClearanceDate = inject('transferClearanceDate') as Date;
const totalTaxedAmount = inject('totalTaxedAmount') as Money;

// Reactive State
const paymentMethods = ref<string[]>([]);

// Computed Properties
const isPaymentMethodIsCash = computed((): boolean => {
  return paymentMethod === 'Cash';
});

const balanceAmount = computed((): Money => {
  const grandTotal = sinvDoc?.grandTotal ?? fyo.pesa(0);

  if (isPesa(paidAmount) && paidAmount.isZero()) {
    return grandTotal.sub(transferAmount);
  }

  return grandTotal.sub(paidAmount);
});

const paidChange = computed((): Money => {
  const grandTotal = sinvDoc?.grandTotal ?? fyo.pesa(0);

  if (fyo.pesa(paidAmount.float).isZero()) {
    return transferAmount.sub(grandTotal);
  }

  return fyo.pesa(paidAmount.float).sub(grandTotal);
});

const showBalanceAmount = computed((): boolean => {
  if (paidAmount.float === 0) {
    return false;
  }

  if (fyo.pesa(paidAmount.float).gte(sinvDoc?.grandTotal ?? fyo.pesa(0))) {
    return false;
  }

  if (transferAmount.gte(sinvDoc?.grandTotal ?? fyo.pesa(0))) {
    return false;
  }

  return true;
});

const showPaidChange = computed((): boolean => {
  if (sinvDoc.isReturn) {
    return false;
  }

  if (
    fyo.pesa(paidAmount.float).eq(fyo.pesa(0)) &&
    transferAmount.eq(fyo.pesa(0))
  ) {
    return false;
  }

  if (fyo.pesa(paidAmount.float).gt(sinvDoc?.grandTotal ?? fyo.pesa(0))) {
    return true;
  }

  if (transferAmount.gt(sinvDoc?.grandTotal ?? fyo.pesa(0))) {
    return true;
  }

  return false;
});

// Methods
const setPaymentMethodAndAmount = (paymentMethodValue?: string) => {
  if (paymentMethodValue) {
    emit('setPaymentMethod', paymentMethodValue);
    emit('setPaidAmount', (sinvDoc.outstandingAmount as Money).float);
  }
};

const setPaymentMethods = async () => {
  paymentMethods.value = (
    (await fyo.db.getAll(ModelNameEnum.PaymentMethod, {
      fields: ['name'],
    })) as { name: string }[]
  ).map((d) => d.name);
};

const submitTransaction = () => {
  if (!paymentMethod) {
    showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before submitting.`,
    });
    return;
  }
  emit('createTransaction');
};

const payTransaction = () => {
  if (!paymentMethod) {
    showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before proceeding with payment.`,
    });
    return;
  }
  emit('createTransaction', false, true);
};

const payAndPrintTransaction = () => {
  if (!paymentMethod) {
    showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before proceeding with payment.`,
    });
    return;
  }

  emit('createTransaction', true, true);
};

const cancelTransaction = () => {
  emit('setPaidAmount', 0);
  emit('toggleModal', 'Payment');
};

// Lifecycles
onMounted(async () => {
  await setPaymentMethods();
});
</script>
