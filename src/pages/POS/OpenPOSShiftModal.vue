<template>
  <Dialog :open="true" @update:open="$router.back()">
    <DialogContent
      class="sm:max-w-[700px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="unlock" class="w-4 h-4 text-primary" />
              {{ t`Open POS Shift` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Initialize shift and cash balance` }}
            </p>
          </div>
        </div>

        <ScrollArea class="max-h-[70vh]">
          <div class="p-8 grid grid-cols-2 gap-8">
            <!-- Left: Cash Denominations -->
            <div class="space-y-4">
              <h4
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
              >
                {{ t`Cash In Denominations` }}
              </h4>
              <div
                v-if="isValuesSeeded"
                class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
              >
                <Table>
                  <TableHeader class="bg-gray-50 dark:bg-gray-890">
                    <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-3"
                        >{{ t`Denomination` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-3 text-right"
                        >{{ t`Count` }}</TableHead
                      >
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, idx) in posShiftDoc?.openingCash"
                      :key="idx"
                      class="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-890 transition-colors"
                    >
                      <TableCell class="py-3 font-bold text-sm">{{
                        row.denomination
                      }}</TableCell>
                      <TableCell class="py-2 text-right">
                        <Input
                          v-model="row.count"
                          type="number"
                          min="0"
                          class="h-9 w-20 ml-auto bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 text-right font-bold text-xs rounded-md"
                          @input="handleChange"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Right: Opening Amounts -->
            <div class="space-y-6">
              <div class="space-y-4">
                <h4
                  class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 px-1"
                >
                  {{ t`Opening Amount` }}
                </h4>
                <div
                  v-if="isValuesSeeded"
                  class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
                >
                  <Table>
                    <TableHeader class="bg-gray-50 dark:bg-gray-890">
                      <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                        <TableHead
                          class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-3"
                          >{{ t`Payment Method` }}</TableHead
                        >
                        <TableHead
                          class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-3 text-right"
                          >{{ t`Amount` }}</TableHead
                        >
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="(row, idx) in posShiftDoc?.openingAmounts"
                        :key="idx"
                        class="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-890 transition-colors"
                      >
                        <TableCell class="py-3 font-bold text-sm capitalize">{{
                          row.paymentMethod
                        }}</TableCell>
                        <TableCell
                          class="py-3 text-right font-bold text-primary dark:text-primary"
                        >
                          {{ row.amount }}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <!-- Summary Card -->
              <div
                class="bg-primary/5 rounded-lg p-6 border border-primary/10 space-y-4"
              >
                <div class="flex items-center justify-between">
                  <span
                    class="text-[10px] font-semibold normal-case tracking-normal text-primary/60"
                    >{{ t`Total Opening Cash` }}</span
                  >
                  <span class="text-xl font-semibold text-primary">{{
                    posOpeningCashAmount
                  }}</span>
                </div>
                <div
                  class="flex items-center gap-3 pt-2 border-t border-primary/10"
                >
                  <div
                    class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"
                  >
                    <LucideIcon name="info" class="w-4 h-4 text-primary" />
                  </div>
                  <p
                    class="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed"
                  >
                    {{
                      t`Ensure all cash and electronic balances are correctly entered before proceeding.`
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
        >
          <UIButton
            variant="outline"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
            @click="$router.back()"
          >
            {{ t`Back` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            @click="handleSubmit"
          >
            {{ t`Open Shift` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import {
  Dialog,
  DialogContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ScrollArea,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { AccountTypeEnum } from 'models/baseModels/Account/types';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { POSOpeningShift } from 'models/inventory/Point of Sale/POSOpeningShift';
import { fyo } from 'src/initFyo';
import { ValidationError } from 'fyo/utils/errors';
import { getPOSOpeningShiftDoc } from 'src/utils/pos';

export default defineComponent({
  name: 'OpenPOSShift',
  components: {
    Dialog,
    DialogContent,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    ScrollArea,
    LucideIcon,
  },
  provide() {
    return {
      doc: computed(() => this.posShiftDoc),
    };
  },
  emits: ['toggleModal'],
  data() {
    return {
      posShiftDoc: undefined as POSOpeningShift | undefined,
      isValuesSeeded: false,
    };
  },
  computed: {
    getDefaultCashDenominations() {
      return fyo.singles.Defaults?.posCashDenominations;
    },
    posCashAccount() {
      return fyo.singles.POSSettings?.cashAccount;
    },
    posOpeningCashAmount(): Money {
      return (this.posShiftDoc?.openingCashAmount as Money) || fyo.pesa(0);
    },
  },
  async mounted() {
    this.isValuesSeeded = false;
    this.posShiftDoc = await getPOSOpeningShiftDoc(fyo);
    await this.seedDefaults();
    this.isValuesSeeded = true;
  },
  methods: {
    async seedDefaultCashDenomiations() {
      if (!this.posShiftDoc) return;
      this.posShiftDoc.openingCash = [];
      const denominations = this.getDefaultCashDenominations;
      if (!denominations) return;
      for (const row of denominations) {
        await this.posShiftDoc.append('openingCash', {
          denomination: row.denomination,
          count: 0,
        });
      }
    },
    async seedPaymentMethods() {
      if (!this.posShiftDoc) return;
      this.posShiftDoc.openingAmounts = [];
      const paymentMethods = (
        (await fyo.db.getAll(ModelNameEnum.PaymentMethod, {
          fields: ['name'],
        })) as { name: string }[]
      ).map((doc) => ({ paymentMethod: doc.name, amount: fyo.pesa(0) }));
      await this.posShiftDoc.set('openingAmounts', paymentMethods);
    },
    async seedDefaults() {
      if (this.posShiftDoc?.isShiftOpen) return;
      await this.seedDefaultCashDenomiations();
      await this.seedPaymentMethods();
    },
    setOpeningCashAmount() {
      if (!this.posShiftDoc?.openingAmounts) return;
      this.posShiftDoc.openingAmounts.map((row) => {
        if (row.paymentMethod === 'Cash') {
          row.amount = this.posShiftDoc?.openingCashAmount as Money;
        }
      });
    },
    handleChange() {
      this.setOpeningCashAmount();
    },
    async handleSubmit() {
      try {
        if (this.posOpeningCashAmount.isNegative()) {
          throw new ValidationError(t`Opening Cash Amount cannot be negative.`);
        }

        await this.posShiftDoc?.setMultiple({
          isShiftOpen: true,
          openingDate: new Date(),
        });

        await this.posShiftDoc?.sync();
        await fyo.singles.POSSettings?.setAndSync('isShiftOpen', true);

        if (!this.posOpeningCashAmount.isZero()) {
          const jvDoc = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, {
            entryType: 'Journal Entry',
          });

          await jvDoc.append('accounts', {
            account: this.posCashAccount,
            debit: this.posOpeningCashAmount,
            credit: fyo.pesa(0),
          });

          await jvDoc.append('accounts', {
            account: AccountTypeEnum.Cash,
            debit: fyo.pesa(0),
            credit: this.posOpeningCashAmount,
          });

          await (await jvDoc.sync()).submit();
        }

        this.$emit('toggleModal', 'ShiftOpen');
        showToast({ type: 'success', message: t`Shift opened successfully` });
      } catch (error) {
        showToast({
          type: 'error',
          message: t`${error as string}`,
        });
      }
    },
  },
});
</script>
