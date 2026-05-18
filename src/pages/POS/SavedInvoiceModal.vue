<template>
  <Modal class="h-auto w-auto p-5" :set-close-listener="false">
    <p class="text-center font-semibold text-description">
      {{ t`Invoices` }}
    </p>

    <hr class="mt-2 border-border" />

    <div class="mt-4">
      <input
        v-model="invoiceSearchTerm"
        type="text"
        placeholder="Search by Invoice Name"
        class="w-full p-2 border rounded-md bg-surface text-main focus:outline-none focus:ring-0"
        @keyup.enter="handleEnterKey"
      />
    </div>

    <div class="flex justify-around items-center">
      <Button
        :background="false"
        class="w-full h-full p-2 mt-2"
        :class="{ 'bg-surface-hover underline': savedInvoiceList }"
        @click="savedInvoiceList = true"
        >Saved</Button
      >

      <Button
        :background="false"
        class="w-full h-full p-2 mt-2"
        :class="{ 'bg-surface-hover underline': !savedInvoiceList }"
        @click="savedInvoiceList = false"
        >Submitted</Button
      >
    </div>

    <Row
      :ratio="ratio"
      class="border border-border flex items-center mt-2 px-2 w-full rounded-t-md text-description"
    >
      <div
        v-for="df in tableFields"
        :key="df.fieldname"
        class="flex items-center px-2 py-2 text-lg"
      >
        {{ df.label }}
      </div>
    </Row>

    <div
      v-if="filteredInvoices.length"
      class="overflow-y-auto custom-scroll custom-scroll-thumb2"
      style="height: 65vh; width: 60vh"
    >
      <Row
        v-for="row in filteredInvoices"
        :key="row.name"
        :ratio="ratio"
        :border="true"
        class="border-b border-l border-r border-border bg-surface flex group h-row-mid hover:bg-surface-hover items-center justify-center px-2 w-full"
        @click="emit('selectedInvoiceName', row)"
      >
        <FormControl
          v-for="df in tableFields"
          :key="df.fieldname"
          size="large"
          :df="df"
          :value="(row as any)[df.fieldname]"
          :read-only="true"
        />
      </Row>
    </div>

    <div class="row-start-6 grid grid-cols-2 gap-4 mt-4">
      <div class="col-span-2">
        <Button
          class="w-full p-5 bg-indicator-red-bg"
          @click="emit('toggleModal', 'SavedInvoice')"
        >
          <slot>
            <p class="uppercase text-lg text-indicator-red-text font-semibold">
              {{ t`Cancel` }}
            </p>
          </slot>
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, inject } from 'vue';
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import Row from 'src/components/Row.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import { Money } from 'pesa';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

// Define Props
const props = defineProps<{
  modalStatus: boolean;
}>();

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', value: string): void;
  (e: 'selectedInvoiceName', value: any): void;
}>();

// App Store / Context Injections
const sinvDoc = inject<any>('sinvDoc');

// Reactive State
const savedInvoiceList = ref(true);
const savedInvoices = ref<any[]>([]);
const submittedInvoices = ref<any[]>([]);
const invoiceSearchTerm = ref('');

// Computed Properties
const ratio = computed(() => {
  return [1, 1, 1, 0.8];
});

const tableFields = computed<Field[]>(() => {
  return [
    {
      fieldname: 'name',
      label: 'Name',
      fieldtype: 'Link',
      target: 'SalesInvoice',
      readOnly: true,
    },
    {
      fieldname: 'party',
      fieldtype: 'Link',
      label: 'Customer',
      target: 'Party',
      placeholder: 'Customer',
      readOnly: true,
    },
    {
      fieldname: 'date',
      label: 'Date',
      fieldtype: 'Date',
      readOnly: true,
    },
    {
      fieldname: 'grandTotal',
      label: 'Grand Total',
      fieldtype: 'Currency',
      readOnly: true,
    },
  ] as Field[];
});

const filteredInvoices = computed(() => {
  const invoices = savedInvoiceList.value
    ? savedInvoices.value
    : submittedInvoices.value;
  return invoices.filter((invoice) =>
    (invoice.name as string)
      .toLowerCase()
      .includes(invoiceSearchTerm.value.toLowerCase())
  );
});

// Methods
const setSavedInvoices = async () => {
  savedInvoices.value = (await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
    fields: [],
    filters: { isPOS: true, submitted: false },
  })) as SalesInvoice[];
};

const setSubmittedInvoices = async () => {
  const invoices = (await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
    fields: [],
    filters: { isPOS: true, submitted: true, returnAgainst: null },
  })) as SalesInvoice[];

  submittedInvoices.value = invoices.filter(
    (invoice) => !(invoice.outstandingAmount as Money).isZero()
  );
};

const _selectedInvoice = async (row: SalesInvoice) => {
  let selectedInvoiceDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    row.name
  )) as SalesInvoice;

  if (sinvDoc && 'value' in sinvDoc) {
    sinvDoc.value = selectedInvoiceDoc;
  } else if (sinvDoc) {
    // If it's a direct object instead of a ref
    Object.assign(sinvDoc, selectedInvoiceDoc);
  }
  emit('toggleModal', 'SavedInvoice');
};

const handleEnterKey = () => {
  if (filteredInvoices.value.length === 1) {
    emit('selectedInvoiceName', filteredInvoices.value[0]);
  }
};

// Watchers
watch(
  () => props.modalStatus,
  async (newVal) => {
    if (newVal) {
      await setSavedInvoices();
      await setSubmittedInvoices();
    }
  }
);

// Lifecycles
onMounted(async () => {
  await setSavedInvoices();
  await setSubmittedInvoices();
  if (false) {
    console.log(_selectedInvoice);
  }
});

onActivated(async () => {
  await setSavedInvoices();
  await setSubmittedInvoices();
});
</script>
