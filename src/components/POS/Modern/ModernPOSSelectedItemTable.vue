<template>
  <Row
    :ratio="ratio"
    class="w-full px-2 mt-2 border rounded-t text-gray-600 dark:border-gray-800 dark:text-gray-400"
  >
    <div
      v-if="tableFields"
      v-for="df in tableFields"
      :key="df.fieldname"
      class="text-lg flex m-2"
      :class="{
        'ms-auto': isNumeric(df as Field),
      }"
    >
      {{ df.label }}
    </div>
  </Row>

  <div
    class="overflow-auto custom-scroll custom-scroll-thumb1"
    style="height: calc(90vh - 25rem)"
  >
    <Row
      v-for="row in sinvDoc.items"
      :key="row.name"
      :ratio="ratio"
      class="p-2 border w-full hover:bg-gray-25 dark:border-gray-800 dark:bg-gray-890"
    >
      <ModernPOSSelectedItemRow
        :row="row as SalesInvoiceItem"
        :expanded-batch-id="expandedBatchId"
        @set-expanded-batch-id="
          (rowName) => $emit('setExpandedBatchId', rowName)
        "
        @selected-row="selectedItemRow"
        @run-sinv-formulas="runSinvFormulas"
        @apply-pricing-rule="$emit('applyPricingRule')"
        @toggle-modal="$emit('toggleModal')"
      />
    </Row>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import Row from 'src/components/Row.vue';
import ModernPOSSelectedItemRow from './ModernPOSSelectedItemRow.vue';
import { isNumeric } from 'src/utils';
import { t } from 'fyo';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { Field } from 'schemas/types';

const props = defineProps<{
  expandedBatchId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggleModal'): void;
  (e: 'selectedRow', row: SalesInvoiceItem, field: string): void;
  (e: 'applyPricingRule'): void;
  (e: 'setExpandedBatchId', rowName: string | undefined): void;
}>();

const sinvDoc = inject('sinvDoc') as SalesInvoice;

const ratio = computed(() => [0.1, 0.8, 0.4, 0.8, 0.8, 0.3]);

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
      label: t`Item`,
      placeholder: 'Item',
      required: true,
      schemaName: 'Item',
    },
    {
      fieldname: 'quantity',
      label: t`Quantity`,
      placeholder: 'Quantity',
      fieldtype: 'Int',
      required: true,
      schemaName: '',
    },
    {
      fieldname: 'rate',
      label: t`Rate`,
      placeholder: 'Rate',
      fieldtype: 'Currency',
      required: true,
      schemaName: '',
    },
    {
      fieldname: 'amount',
      label: t`Amount`,
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

function selectedItemRow(row: SalesInvoiceItem, field: string) {
  emit('selectedRow', row, field);
}
</script>
