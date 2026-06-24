<template>
  <Modal class="w-2/6 ml-auto mr-3.5" :set-close-listener="false">
    <div v-if="sinvDoc.fieldMap" class="px-4 py-6 grid" style="height: 95vh">
      <Currency
        :df="fyo.fieldMap.PaymentFor.amount"
        :read-only="!transferAmount.isZero()"
        :border="true"
        :text-right="true"
        :value="paidAmount"
        @change="
          (amount: Money) => $emit('setPaidAmount', (amount as Money).float)
        "
      />
      <div class="grid grid-cols-2 gap-6">
        <Button
          v-for="method in paymentMethods"
          :key="method"
          class="w-full py-5"
          :type="paymentMethod === method ? 'primary' : 'secondary'"
          @click="setPaymentMethodAndAmount(method)"
        >
          <span class="uppercase text-lg font-semibold">
            {{ t`${method}` }}
          </span>
        </Button>
      </div>

      <div class="mt-8 grid grid-cols-2 gap-6">
        <Data
          v-show="!isPaymentMethodIsCash"
          :df="fyo.fieldMap.Payment.referenceId"
          :show-label="true"
          :border="true"
          :required="!transferAmount.isZero()"
          :read-only="false"
          :value="transferRefNo"
          @change="(value: string) => $emit('setTransferRefNo', value)"
        />

        <Date
          v-show="!isPaymentMethodIsCash"
          :df="fyo.fieldMap.Payment.clearanceDate"
          :show-label="true"
          :border="true"
          :required="!transferAmount.isZero()"
          :read-only="false"
          :value="transferClearanceDate"
          @change="(value: Date) => $emit('setTransferClearanceDate', value)"
        />
      </div>

      <div class="mt-14 grid grid-cols-2 gap-6">
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
      </div>

      <div
        class="mb-14 row-start-4 row-span-2 grid grid-cols-2 gap-x-6 gap-y-11"
      >
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
      </div>

      <div class="grid grid-cols-2 gap-4 bottom-8">
        <div class="col-span-1">
          <Button class="w-full py-5" type="primary" @click="submitTransaction">
            <span class="uppercase text-lg font-semibold">
              {{ t`Submit` }}
            </span>
          </Button>
        </div>

        <div class="col-span-1">
          <Button
            class="w-full py-5"
            type="secondary"
            @click="cancelTransaction"
          >
            <span class="uppercase text-lg font-semibold">
              {{ t`Cancel` }}
            </span>
          </Button>
        </div>

        <div class="col-span-1">
          <Button class="w-full py-5" type="primary" @click="payTransaction">
            <span class="uppercase text-lg font-semibold">
              {{ t`Pay` }}
            </span>
          </Button>
        </div>

        <div class="col-span-1">
          <Button
            class="w-full py-5"
            type="primary"
            @click="payAndPrintTransaction"
          >
            <span class="uppercase text-lg font-semibold">
              {{ t`Pay & Print` }}
            </span>
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import Button from 'src/components/Button.vue';
import Currency from 'src/components/Controls/Currency.vue';
import Data from 'src/components/Controls/Data.vue';
import Date from 'src/components/Controls/Date.vue';
import Modal from 'src/components/Modal.vue';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { fyo } from 'src/initFyo';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import { showToast } from 'src/utils/interactive';

const emit = defineEmits<{
  (e: 'createTransaction', print?: boolean, pay?: boolean): void;
  (e: 'setPaidAmount', floatVal: number): void;
  (e: 'setPaymentMethod', paymentMethod: string): void;
  (e: 'setTransferClearanceDate', date: Date): void;
  (e: 'setTransferRefNo', refVal: string): void;
  (e: 'toggleModal', modalName: string): void;
}>();

const paidAmount = inject('paidAmount') as Money;
const paymentMethod = inject('paymentMethod') as string;
const isDiscountingEnabled = inject('isDiscountingEnabled') as boolean;
const itemDiscounts = inject('itemDiscounts') as Money;
const transferAmount = inject('transferAmount') as Money;
const sinvDoc = inject('sinvDoc') as SalesInvoice;
const transferRefNo = inject('transferRefNo') as string;
const transferClearanceDate = inject('transferClearanceDate') as Date;
const totalTaxedAmount = inject('totalTaxedAmount') as Money;

const paymentMethods = ref<string[]>([]);

const isPaymentMethodIsCash = computed(() => {
  return paymentMethod === 'Cash';
});

const balanceAmount = computed(() => {
  const grandTotal = sinvDoc?.grandTotal ?? fyo.pesa(0);

  if (isPesa(paidAmount) && paidAmount.isZero()) {
    return grandTotal.sub(transferAmount);
  }

  return grandTotal.sub(paidAmount);
});

const paidChange = computed(() => {
  const grandTotal = sinvDoc?.grandTotal ?? fyo.pesa(0);

  if (fyo.pesa(paidAmount.float).isZero()) {
    return transferAmount.sub(grandTotal);
  }

  return fyo.pesa(paidAmount.float).sub(grandTotal);
});

const showBalanceAmount = computed(() => {
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

const showPaidChange = computed(() => {
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

function setPaymentMethodAndAmount(pm?: string) {
  if (pm) {
    emit('setPaymentMethod', pm);
    emit('setPaidAmount', (sinvDoc.outstandingAmount as Money).float);
  }
}

async function setPaymentMethods() {
  paymentMethods.value = (
    (await fyo.db.getAll(ModelNameEnum.PaymentMethod, {
      fields: ['name'],
    })) as { name: string }[]
  ).map((d) => d.name);
}

function submitTransaction() {
  if (!paymentMethod) {
    return showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before submitting.`,
    });
  }
  emit('createTransaction');
}

function payTransaction() {
  if (!paymentMethod) {
    return showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before proceeding with payment.`,
    });
  }
  emit('createTransaction', false, true);
}

function payAndPrintTransaction() {
  if (!paymentMethod) {
    return showToast({
      type: 'error',
      message: fyo.t`Please select a payment method before proceeding with payment.`,
    });
  }

  emit('createTransaction', true, true);
}

function cancelTransaction() {
  emit('setPaidAmount', fyo.pesa(0).float);
  emit('toggleModal', 'Payment');
}

onMounted(async () => {
  await setPaymentMethods();
});
</script>
