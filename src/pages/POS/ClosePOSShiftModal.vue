<template>
  <Dialog
    :open="openModal"
    @update:open="$emit('toggleModal', 'ShiftClose', false)"
  >
    <DialogContent
      class="sm:max-w-[800px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="lock" class="w-4 h-4 text-primary" />
              {{ t`Close POS Shift` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Review and reconcile balances` }}
            </p>
          </div>
        </div>

        <ScrollArea class="max-h-[70vh]">
          <div class="p-8 space-y-8">
            <!-- Closing Cash Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <LucideIcon name="banknote" class="w-4 h-4 text-primary" />
                </div>
                <h2
                  class="text-sm font-semibold normal-case tracking-normal text-foreground/80"
                >
                  {{ t`Closing Cash` }}
                </h2>
              </div>

              <div
                v-if="isValuesSeeded"
                class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
              >
                <Table>
                  <TableHeader class="bg-gray-50 dark:bg-gray-890">
                    <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4"
                        >{{ t`Denomination` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4"
                        >{{ t`Count` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4 text-right"
                        >{{ t`Amount` }}</TableHead
                      >
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, index) in posClosingShiftDoc?.closingCash"
                      :key="index"
                      class="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-890 transition-colors"
                    >
                      <TableCell
                        class="py-4 font-bold text-sm text-foreground/80"
                        >{{ row.denomination }}</TableCell
                      >
                      <TableCell class="py-2">
                        <Input
                          v-model="row.count"
                          type="number"
                          class="h-10 w-24 bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 rounded-md focus:ring-primary/20 font-bold"
                          @input="setClosingCashAmount"
                        />
                      </TableCell>
                      <TableCell
                        class="py-4 text-right font-semibold text-primary"
                      >
                        {{
                          fyo.pesa(Number(row.denomination) * Number(row.count))
                        }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Closing Amounts Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"
                >
                  <LucideIcon name="calculator" class="w-4 h-4 text-primary" />
                </div>
                <h2
                  class="text-sm font-semibold normal-case tracking-normal text-foreground/80"
                >
                  {{ t`Closing Amounts` }}
                </h2>
              </div>

              <div
                v-if="isValuesSeeded"
                class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
              >
                <Table>
                  <TableHeader class="bg-gray-50 dark:bg-gray-890">
                    <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4"
                        >{{ t`Method` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4 text-right"
                        >{{ t`Expected` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4 text-right"
                        >{{ t`Actual` }}</TableHead
                      >
                      <TableHead
                        class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4 text-right"
                        >{{ t`Difference` }}</TableHead
                      >
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, index) in posClosingShiftDoc?.closingAmounts"
                      :key="index"
                      class="border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-890 transition-colors"
                    >
                      <TableCell
                        class="py-4 font-bold text-sm text-foreground/80"
                        >{{ row.paymentMethod }}</TableCell
                      >
                      <TableCell
                        class="py-4 text-right font-medium text-gray-500 dark:text-gray-400"
                        >{{ row.expectedAmount }}</TableCell
                      >
                      <TableCell
                        class="py-4 text-right font-semibold text-foreground"
                        >{{ row.closingAmount }}</TableCell
                      >
                      <TableCell
                        class="py-4 text-right font-semibold"
                        :class="
                          Number(row.differenceAmount) < 0
                            ? 'text-red-400'
                            : 'text-green-400'
                        "
                      >
                        {{ row.differenceAmount }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4"
        >
          <div class="flex flex-col">
            <span
              class="text-[10px] font-semibold normal-case tracking-[0.2em] text-gray-400 dark:text-gray-500"
              >{{ t`Total Reconciliation` }}</span
            >
            <span class="text-xl font-semibold text-primary">{{
              totalClosingAmount
            }}</span>
          </div>
          <div class="flex gap-4">
            <UIButton
              variant="outline"
              class="h-14 px-8 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
              @click="$emit('toggleModal', 'ShiftClose', false)"
            >
              {{ t`Cancel` }}
            </UIButton>
            <UIButton
              class="h-14 px-12 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
              @click="handleSubmit"
            >
              {{ t`Finalize & Close Shift` }}
            </UIButton>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import UIButton from 'src/components/ui/Button.vue';
import Dialog from 'src/components/ui/Dialog.vue';
import DialogContent from 'src/components/ui/DialogContent.vue';
import Input from 'src/components/ui/Input.vue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollArea,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { OpeningAmounts } from 'models/inventory/Point of Sale/OpeningAmounts';
import { POSOpeningShift } from 'models/inventory/Point of Sale/POSOpeningShift';
import { computed, defineComponent } from 'vue';
import { fyo } from 'src/initFyo';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';
import {
  validateClosingAmounts,
  transferPOSCashAndWriteOff,
  getPOSOpeningShiftDoc,
} from 'src/utils/pos';
import { POSClosingShift } from 'models/inventory/Point of Sale/POSClosingShift';
import { ForbiddenError } from 'fyo/utils/errors';

export default defineComponent({
  name: 'ClosePOSShiftModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    ScrollArea,
    LucideIcon,
  },
  provide() {
    return {
      doc: computed(() => this.posClosingShiftDoc),
    };
  },
  props: {
    openModal: {
      default: false,
      type: Boolean,
    },
  },
  emits: ['toggleModal'],
  setup() {
    return {
      t,
      fyo,
    };
  },
  data() {
    return {
      isValuesSeeded: false,
      posOpeningShiftDoc: undefined as POSOpeningShift | undefined,
      posClosingShiftDoc: undefined as POSClosingShift | undefined,
      transactedAmount: {} as Record<string, Money> | undefined,
    };
  },
  computed: {
    isOnline() {
      return !!navigator.onLine;
    },
    totalClosingAmount() {
      if (!this.posClosingShiftDoc?.closingAmounts) return fyo.pesa(0);
      return this.posClosingShiftDoc.closingAmounts.reduce((total, row) => {
        return total.add(row.closingAmount as Money);
      }, fyo.pesa(0));
    },
  },
  watch: {
    openModal: {
      async handler(newVal) {
        if (newVal) {
          await this.setTransactedAmount();
          await this.seedClosingAmounts();
        }
      },
    },
  },
  async activated() {
    this.posClosingShiftDoc = fyo.doc.getNewDoc(
      ModelNameEnum.POSClosingShift
    ) as POSClosingShift;
    await this.seedValues();
    await this.setTransactedAmount();
  },
  async updated() {
    this.posOpeningShiftDoc = await getPOSOpeningShiftDoc(fyo);
    await this.seedValues();
  },
  methods: {
    async setTransactedAmount() {
      this.posOpeningShiftDoc = await getPOSOpeningShiftDoc(fyo);

      const fromDate = this.posOpeningShiftDoc?.openingDate as Date;
      if (!fromDate) {
        return;
      }

      this.transactedAmount = await fyo.db.getPOSTransactedAmount(
        fromDate,
        new Date()
      );
    },
    seedClosingCash() {
      if (!this.posClosingShiftDoc) {
        return;
      }

      this.posClosingShiftDoc.closingCash = [];

      this.posOpeningShiftDoc?.openingCash?.map(async (row) => {
        await this.posClosingShiftDoc?.append('closingCash', {
          count: row.count,
          denomination: row.denomination as Money,
        });
      });
    },
    setClosingCashAmount() {
      if (!this.posClosingShiftDoc?.closingAmounts) {
        return;
      }

      this.posClosingShiftDoc.closingAmounts.map((row) => {
        if (row.paymentMethod === 'Cash') {
          row.closingAmount = this.posClosingShiftDoc
            ?.closingCashAmount as Money;
          row.differenceAmount = (row.closingAmount as Money).sub(
            row.expectedAmount as Money
          );
        }
      });
    },
    async seedClosingAmounts() {
      if (!this.posClosingShiftDoc || !this.posOpeningShiftDoc) {
        return;
      }

      this.posClosingShiftDoc.closingAmounts = [];

      const openingAmounts = this.posOpeningShiftDoc
        ?.openingAmounts as OpeningAmounts[];

      for (const row of openingAmounts) {
        if (!row.paymentMethod) {
          return;
        }

        let expectedAmount = row.amount ?? fyo.pesa(0);

        if (this.transactedAmount) {
          expectedAmount = expectedAmount.add(
            this.transactedAmount[row.paymentMethod]
          );
        }

        await this.posClosingShiftDoc.append('closingAmounts', {
          paymentMethod: row.paymentMethod,
          openingAmount: row.amount,
          closingAmount: fyo.pesa(0),
          expectedAmount: expectedAmount,
          differenceAmount: (fyo.pesa(0) as Money).sub(expectedAmount),
        });
      }
    },
    async seedValues() {
      this.isValuesSeeded = false;
      this.seedClosingCash();
      await this.seedClosingAmounts();
      this.isValuesSeeded = true;
    },
    async handleSubmit() {
      try {
        if (!this.isOnline) {
          throw new ForbiddenError(
            t`Device is offline. Please connect to a network to continue.`
          );
        }

        validateClosingAmounts(this.posClosingShiftDoc as POSClosingShift);
        await this.posClosingShiftDoc?.set('closingDate', new Date());
        await this.posClosingShiftDoc?.set(
          'openingShift',
          this.posOpeningShiftDoc?.name
        );
        await this.posClosingShiftDoc?.sync();
        await transferPOSCashAndWriteOff(
          fyo,
          this.posClosingShiftDoc as POSClosingShift
        );

        await this.fyo.singles.POSSettings?.setAndSync('isShiftOpen', false);
        this.$emit('toggleModal', 'ShiftClose');
        ipc.reloadWindow();
      } catch (error) {
        return showToast({
          type: 'error',
          message: t`${error as string}`,
          duration: 'short',
        });
      }
    },
  },
});
</script>
