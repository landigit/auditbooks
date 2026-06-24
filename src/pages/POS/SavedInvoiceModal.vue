<template>
  <Modal class="h-auto w-auto p-5" :set-close-listener="false">
    <p class="text-center font-semibold dark:text-gray-400">
      {{ t`Invoices` }}
    </p>

    <hr class="mt-2 dark:border-gray-800" />

    <div class="mt-4">
      <input
        v-model="invoiceSearchTerm"
        type="text"
        placeholder="Search by Invoice Name"
        class="w-full p-2 border rounded-md dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-0"
        @keyup.enter="handleEnterKey"
      />
    </div>

    <div class="flex justify-around items-center">
      <Button
        :background="false"
        class="w-full h-full p-2 mt-2"
        :class="{ 'dark:bg-gray-890 underline': savedInvoiceList }"
        @click="savedInvoiceList = true"
        >Saved</Button
      >

      <Button
        :background="false"
        class="w-full h-full p-2 mt-2"
        :class="{ 'dark:bg-gray-890 underline': !savedInvoiceList }"
        @click="savedInvoiceList = false"
        >Submitted</Button
      >
    </div>

    <Row
      :ratio="ratio"
      class="border flex items-center mt-2 px-2 w-full rounded-t-md text-gray-600 dark:border-gray-800 dark:text-gray-400"
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
        class="border-b border-l border-r dark:border-gray-800 dark:bg-gray-890 flex group h-row-mid hover:bg-gray-25 items-center justify-center px-2 w-full"
        @click="$emit('selectedInvoiceName', row)"
      >
        <FormControl
          v-for="df in tableFields"
          :key="df.fieldname"
          size="large"
          :df="df"
          :value="row[df.fieldname]"
          :read-only="true"
        />
      </Row>
    </div>

    <div class="row-start-6 grid grid-cols-2 gap-4 mt-4">
      <div class="col-span-2">
        <Button
          class="w-full p-5 bg-red-500 dark:bg-red-700"
          @click="$emit('toggleModal', 'SavedInvoice')"
        >
          <slot>
            <p class="uppercase text-lg text-white font-semibold">
              {{ t`Cancel` }}
            </p>
          </slot>
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated } from 'vue';
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import Row from 'src/components/Row.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import { Money } from 'pesa';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';

const props = defineProps<{
  modalStatus: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string): void;
  (e: 'selectedInvoiceName', row: any): void;
}>();

const savedInvoiceList = ref(true);
const savedInvoices = ref<any[]>([]);
const submittedInvoices = ref<any[]>([]);
const invoiceSearchTerm = ref('');

const ratio = computed(() => [1, 1, 1, 0.8]);

const tableFields = computed(() => {
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

async function setSavedInvoices() {
  savedInvoices.value = (await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
    fields: [],
    filters: { isPOS: true, submitted: false },
  })) as SalesInvoice[];
}

async function setSubmittedInvoices() {
  const invoices = (await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
    fields: [],
    filters: { isPOS: true, submitted: true, returnAgainst: null },
  })) as SalesInvoice[];

  submittedInvoices.value = invoices.filter(
    (invoice) => !(invoice.outstandingAmount as Money).isZero()
  );
}

function selectedInvoice(row: SalesInvoice) {
  emit('selectedInvoiceName', row);
}

function handleEnterKey() {
  if (filteredInvoices.value.length === 1) {
    emit('selectedInvoiceName', filteredInvoices.value[0]);
  }
}

watch(
  () => props.modalStatus,
  async (newVal) => {
    if (newVal) {
      await setSavedInvoices();
      await setSubmittedInvoices();
    }
  }
);

onMounted(async () => {
  await setSavedInvoices();
  await setSubmittedInvoices();
});

onActivated(async () => {
  await setSavedInvoices();
  await setSubmittedInvoices();
});
</script>
