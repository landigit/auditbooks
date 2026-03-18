<template>
  <Dialog :open="true" @update:open="closeKeyboardModal">
    <DialogContent
      class="sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="grid" class="w-4 h-4 text-primary" />
              {{ t`Numeric Keypad` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{
                selectedItemRow?.fieldMap[selectedItemField!]?.label ||
                t`Enter Value`
              }}
            </p>
          </div>
        </div>

        <div class="p-8 space-y-6">
          <!-- Display / Input Area -->
          <div class="relative group">
            <component
              :is="selectedItemRow?.fieldMap[selectedItemField!]?.fieldtype"
              ref="dynamicInput"
              :df="{
                fieldname: selectedItemRow?.fieldMap[selectedItemField!]
                  ?.fieldname as string,
                fieldtype:
                  selectedItemRow?.fieldMap[selectedItemField!]?.fieldtype,
                label: selectedItemRow?.fieldMap[selectedItemField!]
                  ?.label as string,
              }"
              class="modern-input-wrapper"
              :border="true"
              :show-label="true"
              :value="selectedValue"
              :focus-input="true"
              @change="(value: string) => handleInput(value)"
            />
          </div>

          <!-- Keypad Grid -->
          <div class="grid grid-cols-4 gap-3">
            <UIButton
              v-for="key in ['7', '8', '9']"
              :key="key"
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all"
              @click="appendValue(key)"
            >
              {{ key }}
            </UIButton>
            <UIButton
              variant="outline"
              class="h-16 text-xs font-semibold normal-case tracking-normal rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-red-500/10 hover:border-red-500/20 text-red-400 transition-all"
              @click="deleteLast"
            >
              {{ t`Del` }}
            </UIButton>

            <UIButton
              v-for="key in ['4', '5', '6']"
              :key="key"
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all"
              @click="appendValue(key)"
            >
              {{ key }}
            </UIButton>
            <UIButton
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all text-primary"
              @click="appendValue('-')"
            >
              -
            </UIButton>

            <UIButton
              v-for="key in ['1', '2', '3']"
              :key="key"
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all"
              @click="appendValue(key)"
            >
              {{ key }}
            </UIButton>
            <UIButton
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all text-primary"
              @click="appendValue('+')"
            >
              +
            </UIButton>

            <UIButton
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all text-primary"
              @click="appendValue('.')"
            >
              .
            </UIButton>
            <UIButton
              variant="outline"
              class="h-16 text-xl font-semibold rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-primary/10 hover:border-primary/20 transition-all"
              @click="appendValue('0')"
            >
              0
            </UIButton>
            <UIButton
              variant="outline"
              class="col-span-2 h-16 text-xs font-semibold normal-case tracking-normal rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 hover:bg-gray-100 dark:bg-gray-800 transition-all"
              @click="reset"
            >
              {{ t`Clear` }}
            </UIButton>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
        >
          <UIButton
            variant="outline"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
            @click="closeKeyboardModal"
          >
            {{ t`Cancel` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            @click="saveSelectedItem"
          >
            {{ t`Apply Value` }}
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
import { Dialog, DialogContent, Input } from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { ValidationError } from 'fyo/utils/errors';
import { validateQty } from 'models/helpers';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { ModelNameEnum } from 'models/types';
import Float from 'src/components/Controls/Float.vue';
import Currency from 'src/components/Controls/Currency.vue';

export default defineComponent({
  name: 'KeyboardModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    LucideIcon,
    Float,
    Currency,
  },
  props: {
    modalStatus: Boolean,
    selectedItemRow: SalesInvoiceItem,
    selectedItemField: {
      type: String,
      default: '',
    },
  },
  emits: ['toggleModal', 'applyPricingRule'],
  setup() {
    return {
      t,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      selectedValue: '',
    };
  },
  watch: {
    async modalStatus(newVal) {
      if (newVal) {
        await this.$nextTick();
        await this.focusInput();
      }
      this.updateSelectedValue();
    },
  },
  async mounted() {
    this.updateSelectedValue();
    await this.focusInput();
  },
  methods: {
    async appendValue(value: string) {
      if (value === '-') {
        this.selectedValue = this.selectedValue.startsWith('-')
          ? this.selectedValue
          : `-${this.selectedValue}`;
      } else if (value === '+') {
        this.selectedValue = this.selectedValue.startsWith('-')
          ? this.selectedValue.slice(1)
          : this.selectedValue;
      } else {
        this.selectedValue =
          this.selectedValue === '0' || this.selectedValue === ''
            ? value
            : this.selectedValue + value;
      }
      await this.focusInput();
    },
    updateSelectedValue() {
      this.selectedValue = '';
      if (!this.selectedItemRow || !this.selectedItemField) return;

      if (
        this.selectedItemRow.fieldMap[this.selectedItemField].fieldtype !==
        ModelNameEnum.Currency
      ) {
        this.selectedValue = (
          this.selectedItemRow[
            this.selectedItemField as keyof SalesInvoiceItem
          ] || ''
        ).toString();
      }
    },
    handleInput(value: string) {
      this.selectedValue = value;
    },
    async saveSelectedItem() {
      if (!this.selectedItemRow || !this.selectedItemField) return;

      try {
        const fieldType =
          this.selectedItemRow.fieldMap[this.selectedItemField].fieldtype;
        const numericValue = Number(this.selectedValue);

        if (fieldType === ModelNameEnum.Currency) {
          (this.selectedItemRow as any)[this.selectedItemField] =
            this.fyo.pesa(numericValue);

          if (this.selectedItemField === 'rate') {
            this.selectedItemRow.setRate = this.fyo.pesa(numericValue);
            await this.sinvDoc.runFormulas();
            this.$emit('toggleModal', 'Keyboard');
            return;
          }

          if (this.selectedItemField === 'itemDiscountAmount') {
            if (this.sinvDoc.grandTotal?.lte(numericValue)) {
              throw new ValidationError(
                t`Discount Amount cannot be greater than Grand Total.`
              );
            }
            await this.selectedItemRow.set('setItemDiscountAmount', true);
            await this.selectedItemRow.set(
              'itemDiscountAmount',
              this.fyo.pesa(numericValue)
            );
          }
        } else {
          (this.selectedItemRow as any)[this.selectedItemField] = numericValue;

          if (this.selectedItemField === 'itemDiscountPercent') {
            if (numericValue > 100) {
              throw new ValidationError(
                t`Discount Percent cannot be greater than 100.`
              );
            }
            await this.selectedItemRow.set('setItemDiscountAmount', false);
            await this.selectedItemRow.set('itemDiscountPercent', numericValue);
          }

          if (this.selectedItemField === 'quantity') {
            const existingItems =
              this.sinvDoc.items?.filter(
                (item: InvoiceItem) =>
                  item.item === this.selectedItemRow?.item && !item.isFreeItem
              ) ?? [];
            await validateQty(
              this.sinvDoc,
              this.selectedItemRow,
              existingItems
            );
            this.$emit('applyPricingRule');
          }
        }

        await this.sinvDoc.runFormulas();
        this.$emit('toggleModal', 'Keyboard');
        showToast({ type: 'success', message: t`Value updated` });
      } catch (error) {
        showToast({
          type: 'error',
          message: (error as any).message || t`Update failed`,
        });
        if (this.selectedItemField === 'quantity') {
          this.$emit('applyPricingRule');
        }
      }
    },
    async deleteLast() {
      this.selectedValue = this.selectedValue?.slice(0, -1);
      await this.focusInput();
    },
    async reset() {
      this.selectedValue = '';
      await this.focusInput();
    },
    async focusInput() {
      await this.$nextTick();
      const input =
        (this.$refs.dynamicInput as any)?.$el?.querySelector('input') ||
        (this.$refs.dynamicInput as any)?.$el;
      input?.focus();
    },
    async closeKeyboardModal() {
      this.selectedValue = '';
      this.$emit('toggleModal', 'Keyboard');
    },
  },
});
</script>

<style scoped>
.modern-input-wrapper :deep(label) {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #999999;
  margin-bottom: 0.5rem;
  display: block;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}
.modern-input-wrapper :deep(input) {
  height: 3.5rem;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 150ms ease-in-out;
  font-weight: 700;
  font-size: 1.125rem;
}
</style>
