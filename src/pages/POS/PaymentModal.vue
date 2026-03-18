<template>
  <Dialog :open="true" @update:open="cancelTransaction">
    <DialogContent
      class="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none"
    >
      <div
        class="bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95 h-[95vh]"
      >
        <!-- Header -->
        <div
          class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 flex items-center justify-between shrink-0"
        >
          <div class="flex flex-col gap-1">
            <h3
              class="text-xs font-semibold normal-case tracking-[0.3em] text-primary dark:text-primary flex items-center gap-2"
            >
              <LucideIcon name="credit-card" class="w-4 h-4 text-primary" />
              {{ t`Payment Checkout` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Select method and complete transaction` }}
            </p>
          </div>
        </div>

        <ScrollArea class="flex-1">
          <div class="p-8 space-y-8">
            <!-- Amount Entry -->
            <div class="space-y-4">
              <h4
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
              >
                {{ t`Paid Amount` }}
              </h4>
              <div class="relative group">
                <Input
                  :value="paidAmount.float"
                  type="number"
                  placeholder="0.00"
                  class="h-20 text-3xl font-semibold text-right rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all pr-8"
                  :read-only="!transferAmount.isZero()"
                  @input="
                    (e: Event) =>
                      $emit(
                        'setPaidAmount',
                        Number((e.target as HTMLInputElement).value)
                      )
                  "
                />
                <div
                  class="absolute left-6 top-1/2 -translate-y-1/2 font-semibold text-gray-400 dark:text-gray-500 text-xl"
                >
                  {{ sinvDoc.currency }}
                </div>
              </div>

              <!-- Payment Methods Grid -->
              <div class="grid grid-cols-2 gap-3">
                <UIButton
                  v-for="method in paymentMethods"
                  :key="method"
                  variant="outline"
                  class="h-16 rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all font-semibold normal-case tracking-normal text-[10px]"
                  :class="{
                    'bg-primary text-primary-foreground border-primary':
                      paymentMethod === method,
                  }"
                  @click="setPaymentMethodAndAmount(method)"
                >
                  {{ t`${method}` }}
                </UIButton>
              </div>
            </div>

            <!-- Reference Details (Conditional) -->
            <div
              v-show="!isPaymentMethodIsCash"
              class="space-y-4 animate-in slide-in-from-top-2 duration-300"
            >
              <h4
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
              >
                {{ t`Reference Details` }}
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-bold text-gray-400 dark:text-gray-500 normal-case px-1"
                    >{{ t`Reference ID` }}</label
                  >
                  <Input
                    type="text"
                    :value="transferRefNo"
                    placeholder="Ref #"
                    class="h-12 rounded-md bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800"
                    @input="
                      (e: Event) =>
                        $emit(
                          'setTransferRefNo',
                          (e.target as HTMLInputElement).value
                        )
                    "
                  />
                </div>
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-bold text-gray-400 dark:text-gray-500 normal-case px-1"
                    >{{ t`Clearance Date` }}</label
                  >
                  <Input
                    type="date"
                    :value="transferClearanceDate"
                    class="h-12 rounded-md bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800"
                    @input="
                      (e: Event) =>
                        $emit(
                          'setTransferClearanceDate',
                          (e.target as HTMLInputElement).value
                        )
                    "
                  />
                </div>
              </div>
            </div>

            <!-- Totals Summary -->
            <div class="space-y-4">
              <h4
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
              >
                {{ t`Transaction Summary` }}
              </h4>
              <div
                class="bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 rounded-lg p-6 space-y-4"
              >
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-500 dark:text-gray-400 font-medium">{{
                    t`Net Total`
                  }}</span>
                  <span class="font-bold">{{ sinvDoc.netTotal }}</span>
                </div>
                <div class="flex justify-between items-center text-xs">
                  <span class="text-gray-500 dark:text-gray-400 font-medium">{{
                    t`Taxes & Charges`
                  }}</span>
                  <span class="font-bold">{{ totalTaxedAmount }}</span>
                </div>
                <div
                  v-if="isDiscountingEnabled"
                  class="flex justify-between items-center text-xs"
                >
                  <span class="text-gray-500 dark:text-gray-400 font-medium">{{
                    t`Total Discounts`
                  }}</span>
                  <span class="font-bold text-red-400"
                    >-{{ itemDiscounts }}</span
                  >
                </div>
                <Separator class="bg-gray-100 dark:bg-gray-800" />
                <div class="flex justify-between items-center">
                  <span
                    class="text-[10px] font-semibold normal-case tracking-normal text-primary"
                    >{{ t`Grand Total` }}</span
                  >
                  <span class="text-xl font-semibold text-primary">{{
                    sinvDoc.grandTotal
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Change / Balance Status -->
            <div class="grid grid-cols-2 gap-4">
              <div
                v-show="showPaidChange"
                class="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex flex-col gap-1"
              >
                <span
                  class="text-[10px] font-semibold normal-case tracking-normal text-green-400/80"
                  >{{ t`Change Due` }}</span
                >
                <span class="text-lg font-semibold text-green-400">{{
                  paidChange
                }}</span>
              </div>
              <div
                v-show="showBalanceAmount"
                class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-1"
              >
                <span
                  class="text-[10px] font-semibold normal-case tracking-normal text-amber-400/80"
                  >{{ t`Balance Remaining` }}</span
                >
                <span class="text-lg font-semibold text-amber-400">{{
                  balanceAmount
                }}</span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- Footer Actions -->
        <div class="p-8 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div class="grid grid-cols-2 gap-4">
            <UIButton
              variant="outline"
              class="h-16 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
              @click="cancelTransaction"
            >
              {{ t`Cancel` }}
            </UIButton>
            <UIButton
              class="h-16 rounded-lg font-semibold normal-case tracking-normal text-[10px] bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all"
              @click="submitTransaction"
            >
              {{ t`Submit Only` }}
            </UIButton>
            <UIButton
              class="h-16 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] transition-all"
              @click="payTransaction"
            >
              {{ t`Pay Standard` }}
            </UIButton>
            <UIButton
              class="h-16 rounded-lg font-semibold normal-case tracking-normal text-[10px] bg-green-500 text-white hover:bg-green-600 shadow-[0_10px_20px_-5px_rgba(34,197,94,0.3)] hover:translate-y-[-2px] transition-all"
              @click="payAndPrintTransaction"
            >
              {{ t`Pay & Print` }}
            </UIButton>
          </div>
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
  ScrollArea,
  Separator,
  Card,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { Money } from 'pesa';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { fyo } from 'src/initFyo';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';

export default defineComponent({
  name: 'PaymentModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    ScrollArea,
    Separator,
    Card,
    LucideIcon,
  },
  emits: [
    'createTransaction',
    'setPaidAmount',
    'setPaymentMethod',
    'setTransferClearanceDate',
    'setTransferRefNo',
    'toggleModal',
  ],
  setup() {
    return {
      t,
      fyo,
      paidAmount: inject('paidAmount') as Money,
      paymentMethod: inject('paymentMethod') as string,
      isDiscountingEnabled: inject('isDiscountingEnabled') as boolean,
      itemDiscounts: inject('itemDiscounts') as Money,
      transferAmount: inject('transferAmount') as Money,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
      transferRefNo: inject('transferRefNo') as string,
      transferClearanceDate: inject('transferClearanceDate') as Date,
      totalTaxedAmount: inject('totalTaxedAmount') as Money,
    };
  },
  data() {
    return {
      paymentMethods: [] as string[],
    };
  },
  computed: {
    isPaymentMethodIsCash(): boolean {
      return this.paymentMethod === 'Cash';
    },
    balanceAmount(): Money {
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);
      if (isPesa(this.paidAmount) && this.paidAmount.isZero()) {
        return grandTotal.sub(this.transferAmount);
      }
      return grandTotal.sub(this.paidAmount);
    },
    paidChange(): Money {
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);
      const currentPaid = fyo.pesa(this.paidAmount.float);
      if (currentPaid.isZero()) {
        return this.transferAmount.sub(grandTotal);
      }
      return currentPaid.sub(grandTotal);
    },
    showBalanceAmount(): boolean {
      if (this.paidAmount.float === 0) return false;
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);
      if (fyo.pesa(this.paidAmount.float).gte(grandTotal)) return false;
      if (this.transferAmount.gte(grandTotal)) return false;
      return true;
    },
    showPaidChange(): boolean {
      if (this.sinvDoc.isReturn) return false;
      const grandTotal = this.sinvDoc?.grandTotal ?? fyo.pesa(0);
      const currentPaid = fyo.pesa(this.paidAmount.float);
      if (currentPaid.isZero() && this.transferAmount.isZero()) return false;
      if (currentPaid.gt(grandTotal)) return true;
      if (this.transferAmount.gt(grandTotal)) return true;
      return false;
    },
  },
  async mounted() {
    await this.setPaymentMethods();
  },
  methods: {
    async setPaymentMethods() {
      try {
        const methods = (await fyo.db.getAll(ModelNameEnum.PaymentMethod, {
          fields: ['name'],
        })) as { name: string }[];
        this.paymentMethods = methods.map((d) => d.name);
      } catch (error) {
        console.error('Failed to load payment methods:', error);
      }
    },
    setPaymentMethodAndAmount(method: string) {
      this.$emit('setPaymentMethod', method);
      this.$emit(
        'setPaidAmount',
        (this.sinvDoc.outstandingAmount as Money).float
      );
    },
    submitTransaction() {
      if (!this.paymentMethod) {
        return showToast({
          type: 'error',
          message: t`Please select a payment method.`,
        });
      }
      this.$emit('createTransaction');
    },
    payTransaction() {
      if (!this.paymentMethod) {
        return showToast({
          type: 'error',
          message: t`Please select a payment method.`,
        });
      }
      this.$emit('createTransaction', false, true);
    },
    payAndPrintTransaction() {
      if (!this.paymentMethod) {
        return showToast({
          type: 'error',
          message: t`Please select a payment method.`,
        });
      }
      this.$emit('createTransaction', true, true);
    },
    cancelTransaction() {
      this.$emit('setPaidAmount', fyo.pesa(0));
      this.$emit('toggleModal', 'Payment');
    },
  },
});
</script>
