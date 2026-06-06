<template>
  <view v-if="!isLynx">
    <Modal class="h-auto w-auto p-5" :set-close-listener="false">
      <text class="text-center font-semibold text-description">
        {{ t`Invoices` }}
      </text>

      <view class="border-b border-border mt-2" />

      <view class="mt-4">
        <input
          v-model="invoiceSearchTerm"
          type="text"
          placeholder="Search by Invoice Name"
          class="w-full p-2 border rounded-md bg-surface text-main focus:outline-none focus:ring-0"
          @keydown.enter="handleSearchEnter"
        />
      </view>

      <view class="border-b border-border mt-2" />

      <Row
        :ratio="ratio"
        class="border border-border items-center mt-2 px-2 w-full rounded-t-md text-description"
      >
        <view
          v-for="df in tableFields"
          :key="df.fieldname"
          class="flex items-center px-2 py-2 text-lg"
        >
          {{ df.label }}
        </view>
      </Row>

      <view
        class="overflow-y-auto custom-scroll custom-scroll-thumb2"
        style="height: 65vh; width: 60vh"
      >
        <Row
          v-for="row in paginatedInvoices"
          :key="row.name"
          :ratio="ratio"
          :border="true"
          class="border-b border-l border-r border-border bg-surface group h-row-mid hover:bg-surface-hover items-center justify-center px-2 w-full"
          @tap="returnInvoice(row as SalesInvoice)"
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
      </view>

      <view class="mt-1 mb-1">
        <Paginator
          :item-count="filteredInvoices.length"
          :allowed-counts="[20, 40, -1]"
          @index-change="setPageIndices"
        />
      </view>

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-1">
        <view class="col-span-2">
          <Button
            class="w-full p-5 bg-indicator-red-bg"
            @tap="emit('toggleModal', 'SavedInvoice')"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-red-text font-semibold"
              >
                {{ t`Cancel` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>
    </Modal>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Return Sales Invoice Modal</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, inject } from "vue";
import Button from "src/components/Button.vue";
import Modal from "src/components/Modal.vue";
import Row from "src/components/Row.vue";
import FormControl from "src/components/Controls/FormControl.vue";
import { SalesInvoice } from "models/baseModels/SalesInvoice/SalesInvoice";
import { ModelNameEnum } from "models/types";
import { Field } from "schemas/types";
import { Money } from "pesa";
import Paginator from "src/components/Paginator.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";

// Define Props
const props = defineProps<{
  modalStatus: boolean;
}>();

// Define Emits
const emit = defineEmits<{
  (e: "toggleModal", modal: string): void;
  (e: "selectedReturnInvoice", invoiceName: string): void;
}>();

// App Store / Context Injections
const _sinvDoc = inject("sinvDoc") as SalesInvoice;

// Reactive State
const returnedInvoices = ref<any[]>([]);
const invoiceSearchTerm = ref("");
const pageStart = ref(0);
const pageEnd = ref(20);

// Computed Properties
const ratio = computed(() => {
  return [1, 1, 1, 0.8];
});

const tableFields = computed<Field[]>(() => {
  return [
    {
      fieldname: "name",
      label: "Name",
      fieldtype: "Link",
      target: "SalesInvoice",
      readOnly: true,
    },
    {
      fieldname: "party",
      fieldtype: "Link",
      label: "Customer",
      target: "Party",
      placeholder: "Customer",
      readOnly: true,
    },
    {
      fieldname: "date",
      label: "Date",
      fieldtype: "Date",
      readOnly: true,
    },
    {
      fieldname: "grandTotal",
      label: "Grand Total",
      fieldtype: "Currency",
      readOnly: true,
    },
  ] as Field[];
});

const filteredInvoices = computed(() => {
  return returnedInvoices.value.filter((invoice) =>
    (invoice.name as string)
      .toLowerCase()
      .includes(invoiceSearchTerm.value.toLowerCase()),
  );
});

const paginatedInvoices = computed(() => {
  return filteredInvoices.value.slice(pageStart.value, pageEnd.value);
});

// Methods
const returnInvoice = (row: SalesInvoice) => {
  emit("selectedReturnInvoice", row.name as string);
  emit("toggleModal", "ReturnSalesInvoice");
};

const handleSearchEnter = () => {
  if (filteredInvoices.value.length === 1) {
    returnInvoice(filteredInvoices.value[0] as SalesInvoice);
  }
};

const setPageIndices = ({ start, end }: { start: number; end: number }) => {
  pageStart.value = start;
  pageEnd.value = end;
};

const setReturnedInvoices = async () => {
  const allInvoices = await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
    fields: [],
    filters: {
      isPOS: true,
      submitted: true,
      cancelled: false,
    },
  });

  const returnedInvoiceNames = allInvoices
    .filter((inv) => {
      if (inv.isFullyReturned || inv.returnAgainst) {
        return false;
      }

      if (inv.isReturned && !inv.isFullyReturned) {
        return true;
      }

      if (!inv.isReturned && !inv.returnAgainst) {
        return true;
      }

      if (!inv.isReturned && !(inv.outstandingAmount as Money).isZero()) {
        return true;
      }

      return false;
    })
    .map((inv) => inv.name);

  returnedInvoices.value = allInvoices.filter((inv) =>
    returnedInvoiceNames.includes(inv.name),
  ) as SalesInvoice[];
};

// Watchers
watch(
  () => props.modalStatus,
  async (newVal) => {
    if (newVal) {
      await setReturnedInvoices();
    }
  },
);

watch(invoiceSearchTerm, () => {
  pageStart.value = 0;
  pageEnd.value = pageEnd.value - pageStart.value || 20;
});

// Lifecycles
onMounted(async () => {
  await setReturnedInvoices();
  if (false) {
    console.log(_sinvDoc);
  }
});

onActivated(async () => {
  await setReturnedInvoices();
});
</script>
