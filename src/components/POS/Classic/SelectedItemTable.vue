<template>
  <Row
    :ratio="ratio"
    class="border dark:border-gray-800 rounded-t px-2 text-gray-600 dark:text-gray-400 w-full flex items-center mt-2"
  >
    <div
      v-if="tableFields"
      v-for="df in tableFields"
      :key="df.fieldname"
      class="items-center text-lg flex px-2 py-2"
      :class="{
        'ms-auto': isNumeric(df as Field),
      }"
      :style="{
        height: ``,
      }"
    >
      {{ df.label }}
    </div>
  </Row>

  <div
    class="overflow-y-auto overflow-x-auto custom-scroll custom-scroll-thumb1"
    style="height: 50vh"
  >
    <Row
      v-for="row in sinvDoc.items"
      :key="row.name"
      :ratio="ratio"
      class="border dark:border-gray-800 w-full px-2 py-2 group flex items-center justify-center hover:bg-gray-25 dark:bg-gray-890"
    >
      <SelectedItemRow
        :row="row as SalesInvoiceItem"
        :expanded-batch-id="expandedBatchId"
        @set-expanded-batch-id="
          (rowName) => $emit('setExpandedBatchId', rowName)
        "
        @run-sinv-formulas="runSinvFormulas"
        @apply-pricing-rule="$emit('applyPricingRule')"
        @selected-row="selectedItemRow"
      />
    </Row>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import Row from 'src/components/Row.vue';
import SelectedItemRow from './SelectedItemRow.vue';
import { isNumeric } from 'src/utils';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { Field } from 'schemas/types';

const props = defineProps<{
  expandedBatchId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'applyPricingRule'): void;
  (e: 'selectedRow', row: SalesInvoiceItem): void;
  (e: 'setExpandedBatchId', rowName: string): void;
}>();

const sinvDoc = inject('sinvDoc') as SalesInvoice;

const ratio = computed(() => [0.1, 0.9, 0.8, 0.8, 0.8, 0.8, 0.2]);

const tableFields = computed(() => {
  return [
    {
      fieldname: 'toggler',
      fieldtype: 'Link',
      label: ' ',
    },
    {
      fieldname: 'item',
      fieldtype: 'Link',
      label: 'Item',
      placeholder: 'Item',
      required: true,
      schemaName: 'Item',
    },
    {
      fieldname: 'quantity',
      label: 'Quantity',
      placeholder: 'Quantity',
      fieldtype: 'Int',
      required: true,
      schemaName: '',
    },
    {
      fieldname: 'unit',
      label: 'Unit Type',
      placeholder: 'Unit',
      fieldtype: 'Link',
      required: true,
      schemaName: 'UOM',
    },
    {
      fieldname: 'rate',
      label: 'Rate',
      placeholder: 'Rate',
      fieldtype: 'Currency',
      required: true,
      schemaName: '',
    },
    {
      fieldname: 'amount',
      label: 'Amount',
      placeholder: 'Amount',
      fieldtype: 'Currency',
      required: true,
      schemaName: '',
    },
    {
      fieldname: 'removeItem',
      fieldtype: 'Link',
      label: ' ',
    },
  ];
});

async function runSinvFormulas() {
  await sinvDoc.runFormulas();
}

function selectedItemRow(row: SalesInvoiceItem) {
  emit('selectedRow', row);
}
</script>
