<template>
  <Modal class="h-auto" :set-close-listener="false">
    <div class="px-5" style="width: 30vw">
      <p class="text-center dark:text-gray-400 font-semibold py-3">Keyboard</p>
      <hr class="dark:border-gray-800" />
      <div class="mx-6 my-3">
        <component
          v-if="selectedItemRow && selectedItemField"
          :is="selectedItemRow.fieldMap[selectedItemField].fieldtype"
          ref="dynamicInput"
          :df="{
            fieldname: selectedItemRow.fieldMap[selectedItemField]
              .fieldname as string,
            fieldtype: selectedItemRow.fieldMap[selectedItemField].fieldtype,
            label: selectedItemRow.fieldMap[selectedItemField].label as string,
          }"
          class="mb-3"
          :border="true"
          :show-label="true"
          :value="selectedValue"
          :focus-input="true"
          @change="(value: number) => handleInput(value.toString())"
        />

        <div
          id="keypad"
          class="text-4xl grid grid-cols-4 gap-3 rounded font-bold py-4 dark:text-gray-400"
        >
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('7')"
          >
            7
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('8')"
          >
            8
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('9')"
          >
            9
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="deleteLast()"
          >
            Del
          </button>

          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('4')"
          >
            4
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('5')"
          >
            5
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('6')"
          >
            6
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('-')"
          >
            -
          </button>

          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('1')"
          >
            1
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('2')"
          >
            2
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('3')"
          >
            3
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('+')"
          >
            +
          </button>

          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('.')"
          >
            •
          </button>
          <button
            class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
            @click="appendValue('0')"
          >
            0
          </button>
          <div class="grid col-span-2">
            <button
              class="py-2.5 bg-gray-100 text-2xl border-transparent rounded-lg transition-colors duration-200 hover:bg-gray-200 dark:bg-gray-875 dark:hover:bg-gray-900"
              @click="reset()"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div class="px-5">
        <div class="grid row-start-6 grid-cols-2 gap-4 mt-auto mb-3">
          <div class="col-span-2">
            <Button
              class="w-full bg-green-500 dark:bg-green-700"
              style="padding: 1.35rem"
              @click="saveSelectedItem()"
            >
              <slot>
                <p class="uppercase text-lg text-white font-semibold">
                  {{ t`Save` }}
                </p>
              </slot>
            </Button>
          </div>
        </div>

        <div class="grid row-start-6 grid-cols-2 gap-4 mt-auto mb-8">
          <div class="col-span-2">
            <Button
              class="w-full bg-red-500 dark:bg-red-700"
              style="padding: 1.35rem"
              @click="closeKeyboardModal()"
            >
              <slot>
                <p class="uppercase text-lg text-white font-semibold">
                  {{ t`Cancel` }}
                </p>
              </slot>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import Modal from 'src/components/Modal.vue';
import { ModelNameEnum } from 'models/types';
import { inject } from 'vue';
import Button from 'src/components/Button.vue';
import Float from 'src/components/Controls/Float.vue';
import Currency from 'src/components/Controls/Currency.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { ValidationError } from 'fyo/utils/errors';
import { showToast } from 'src/utils/interactive';
import { validateQty } from 'models/helpers';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';

const props = withDefaults(
  defineProps<{
    modalStatus?: boolean;
    selectedItemRow?: SalesInvoiceItem | null;
    selectedItemField?: string;
  }>(),
  {
    modalStatus: false,
    selectedItemRow: null,
    selectedItemField: '',
  }
);

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string): void;
  (e: 'applyPricingRule'): void;
}>();

const sinvDoc = inject('sinvDoc') as SalesInvoice;

const selectedValue = ref('');
const dynamicInput = ref<any>(null);

function updateSelectedValue() {
  selectedValue.value = '';

  if (props.selectedItemRow && props.selectedItemField) {
    const fieldtype =
      props.selectedItemRow.fieldMap[props.selectedItemField]?.fieldtype;
    if (fieldtype !== ModelNameEnum.Currency) {
      selectedValue.value = props.selectedItemRow[
        props.selectedItemField
      ] as string;
    }
  }
}

async function focusInput() {
  await nextTick();
  dynamicInput.value?.focus();
}

async function appendValue(value: string) {
  if (value === '-') {
    selectedValue.value = selectedValue.value.startsWith('-')
      ? selectedValue.value
      : `-${selectedValue.value}`;
  } else if (value === '+') {
    selectedValue.value = selectedValue.value.startsWith('-')
      ? selectedValue.value.slice(1)
      : selectedValue.value;
  } else {
    selectedValue.value =
      selectedValue.value === '0' ? value : selectedValue.value + value;
  }

  await focusInput();
}

function handleInput(value: string) {
  selectedValue.value = value;
}

async function saveSelectedItem() {
  try {
    if (!props.selectedItemRow || !props.selectedItemField) return;
    const fieldMap = props.selectedItemRow.fieldMap;
    const field = fieldMap[props.selectedItemField];

    if (field?.fieldtype === ModelNameEnum.Currency) {
      props.selectedItemRow[props.selectedItemField] = fyo.pesa(
        Number(selectedValue.value)
      );

      if (props.selectedItemField === 'rate') {
        props.selectedItemRow.setRate = fyo.pesa(Number(selectedValue.value));

        await sinvDoc.runFormulas();
        emit('toggleModal', 'Keyboard');
        return;
      }

      if (props.selectedItemField === 'itemDiscountAmount') {
        if (sinvDoc.grandTotal?.lte(selectedValue.value)) {
          props.selectedItemRow.itemDiscountAmount = fyo.pesa(Number(0));

          throw new ValidationError(
            t`Discount Amount (${fyo.format(
              selectedValue.value,
              'Currency'
            )}) cannot be greated than Amount (${fyo.format(
              sinvDoc.grandTotal,
              'Currency'
            )}).`
          );
        }

        await props.selectedItemRow.set('setItemDiscountAmount', true);
        await props.selectedItemRow.set(
          'itemDiscountAmount',
          fyo.pesa(Number(selectedValue.value))
        );
      }
    } else {
      props.selectedItemRow[props.selectedItemField] = Number(
        selectedValue.value
      );

      if (props.selectedItemField === 'itemDiscountPercent') {
        if (Number(selectedValue.value) > 100) {
          await props.selectedItemRow.set('itemDiscountPercent', 0);

          throw new ValidationError(
            t`Discount Percent (${selectedValue.value}) cannot be greater than 100.`
          );
        }

        await props.selectedItemRow.set('setItemDiscountAmount', false);
        await props.selectedItemRow.set(
          'itemDiscountPercent',
          selectedValue.value
        );
      }

      if (props.selectedItemField === 'quantity') {
        const existingItems =
          sinvDoc.items?.filter(
            (invoiceItem: InvoiceItem) =>
              invoiceItem.item === props.selectedItemRow?.item &&
              !invoiceItem.isFreeItem
          ) ?? [];

        await validateQty(sinvDoc, props.selectedItemRow, existingItems);

        emit('applyPricingRule');
      }
    }

    await sinvDoc.runFormulas();
    emit('toggleModal', 'Keyboard');
  } catch (error) {
    showToast({
      type: 'error',
      message: t`${error as string}`,
    });

    if (props.selectedItemField === 'quantity') {
      emit('applyPricingRule');
    }
  }
}

async function deleteLast() {
  selectedValue.value = selectedValue.value?.slice(0, -1);
  await focusInput();
}

async function reset() {
  selectedValue.value = '';
  await focusInput();
}

async function closeKeyboardModal() {
  await reset();
  emit('toggleModal', 'Keyboard');
}

watch(
  () => props.modalStatus,
  async (newVal) => {
    if (newVal) {
      await nextTick();
      await focusInput();
    }
    updateSelectedValue();
  }
);

onMounted(async () => {
  updateSelectedValue();
  await focusInput();
});
</script>
