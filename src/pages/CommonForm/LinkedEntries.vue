<template>
  <div
    class="bg-white dark:bg-gray-850 overflow-y-auto"
    :class="
      isMobile
        ? 'w-full h-full fixed inset-0 z-50'
        : 'w-quick-edit border-l dark:border-gray-800'
    "
  >
    <!-- Page Header -->
    <div
      class="flex items-center justify-between px-4 h-row-largest sticky top-0 bg-white dark:bg-gray-850 border-b dark:border-gray-800"
      style="z-index: 1"
    >
      <div class="flex items-center justify-center w-full relative z-10">
        <Button
          :icon="true"
          class="absolute left-0 z-20"
          @click="$emit('close')"
        >
          <feather-icon name="x" class="w-4 h-4" />
        </Button>
        <p class="text-xl font-semibold linked-title text-center">
          {{ t`Linked Entries` }}
        </p>
      </div>
    </div>

    <!-- Linked Entry List -->
    <div v-if="sequence.length" class="w-full overflow-y-auto">
      <div
        v-for="sn of sequence"
        :key="sn"
        class="border-b dark:border-gray-800 p-4 overflow-auto"
      >
        <!-- Header with count and schema label -->
        <div
          class="flex justify-between cursor-pointer"
          :class="entries[sn].collapsed ? '' : 'pb-4'"
          @click="entries[sn].collapsed = !entries[sn].collapsed"
        >
          <h2 class="text-base font-semibold select-none linked-group-title">
            {{ fyo.schemaMap[sn]?.label ?? sn
            }}<span class="font-normal">{{
              ` – ${entries[sn].details.length}`
            }}</span>
          </h2>
          <feather-icon
            :name="entries[sn].collapsed ? 'chevron-up' : 'chevron-down'"
            class="w-4 h-4 linked-group-chevron"
          />
        </div>

        <!-- Entry list -->
        <div
          v-show="!entries[sn].collapsed"
          class="entry-container rounded-md border dark:border-gray-800 overflow-hidden"
        >
          <!-- Entry -->
          <div
            v-for="e of entries[sn].details"
            :key="String(e.name) + sn"
            class="p-2 text-sm cursor-pointer border-b last:border-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-875"
            @click="routeToDoc(sn, String(e.name))"
          >
            <div class="flex justify-between">
              <!-- Name -->
              <p
                class="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {{ e.name }}
              </p>

              <!-- Date -->
              <p v-if="e.date" class="text-xs linked-entry-date">
                {{ fyo.format(e.date, 'Date') }}
              </p>
            </div>
            <div class="flex gap-2 mt-1 pill-container flex-wrap">
              <!-- Credit or Debit (GLE) -->
              <p
                v-if="isPesa(e.credit) && e.credit.isPositive()"
                class="pill"
                :class="colorClass('green')"
              >
                {{ t`Cr. ${fyo.format(e.credit, 'Currency')}` }}
              </p>
              <p
                v-else-if="isPesa(e.debit) && e.debit.isPositive()"
                class="pill"
                :class="colorClass('red')"
              >
                {{ t`Dr. ${fyo.format(e.debit, 'Currency')}` }}
              </p>

              <!-- Party (Customer / Supplier / Party) -->
              <p v-if="e.party" class="pill" :class="colorClass('yellow')">
                {{ e.party }}
              </p>

              <!-- EntryType or Account -->
              <p
                v-else-if="e.entryType || e.account"
                class="pill"
                :class="
                  colorClass(
                    String(e.entryType || e.account)
                      .toLowerCase()
                      .includes('debtor') ||
                      String(e.entryType || e.account)
                        .toLowerCase()
                        .includes('cash')
                      ? 'yellow'
                      : String(e.entryType || e.account)
                            .toLowerCase()
                            .includes('sgst') ||
                          String(e.entryType || e.account)
                            .toLowerCase()
                            .includes('cgst') ||
                          String(e.entryType || e.account)
                            .toLowerCase()
                            .includes('igst') ||
                          String(e.entryType || e.account)
                            .toLowerCase()
                            .includes('gst')
                        ? 'purple'
                        : 'teal'
                  )
                "
              >
                {{ e.entryType || e.account }}
              </p>

              <p v-if="e.item" class="pill" :class="colorClass('yellow')">
                {{ e.item }}
              </p>
              <p v-if="e.location" class="pill" :class="colorClass('indigo')">
                {{ e.location }}
              </p>

              <!-- Amounts -->
              <p
                v-if="
                  isPesa(e.outstandingAmount) &&
                  e.outstandingAmount.isPositive()
                "
                class="pill no-scrollbar"
                :class="colorClass('orange')"
              >
                {{ t`Unpaid ${fyo.format(e.outstandingAmount, 'Currency')}` }}
              </p>
              <p
                v-else-if="isPesa(e.grandTotal) && e.grandTotal.isPositive()"
                class="pill no-scrollbar"
                :class="colorClass('green')"
              >
                {{ fyo.format(e.grandTotal, 'Currency') }}
              </p>
              <p
                v-else-if="isPesa(e.amount) && e.amount.isPositive()"
                class="pill no-scrollbar"
                :class="colorClass('green')"
              >
                {{ fyo.format(e.amount, 'Currency') }}
              </p>

              <!-- Quantities -->
              <p
                v-if="e.stockNotTransferred"
                class="pill no-scrollbar"
                :class="colorClass('orange')"
              >
                {{
                  t`Pending qty. ${fyo.format(e.stockNotTransferred, 'Float')}`
                }}
              </p>
              <p
                v-else-if="typeof e.quantity === 'number' && e.quantity"
                class="pill no-scrollbar"
                :class="colorClass('gray')"
              >
                {{ t`Qty. ${fyo.format(e.quantity, 'Float')}` }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="p-4 text-sm linked-empty-text">
      {{ t`No linked entries found` }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import Button from 'src/components/Button.vue';
import { getBgTextColorClass } from 'src/utils/colors';
import { getLinkedEntries } from 'src/utils/doc';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useApp } from 'src/composables/useApp';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const COMPONENT_NAME = 'LinkedEntries';

const props = defineProps<{
  doc: Doc;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { fyo, t } = useApp();
const shortcuts = useShortcuts();
const { isMobile } = useBreakpoint();

const entries = ref<
  Record<string, { collapsed: boolean; details: Record<string, unknown>[] }>
>({});

const sequence = computed(() => {
  const seq: string[] = linkSequence.filter(
    (s) => !!entries.value[s]?.details?.length
  );

  for (const s in entries.value) {
    if (seq.includes(s)) {
      continue;
    }
    seq.push(s);
  }

  return seq;
});

const colorClass = getBgTextColorClass;

async function routeToDoc(schemaName: string, name: string) {
  const route = getFormRoute(schemaName, name);
  await routeTo(route);
}

async function setLinkedEntries() {
  const linkedEntries = await getLinkedEntries(props.doc);
  for (const key in linkedEntries) {
    const collapsed = false;
    const entryNames = linkedEntries[key];
    if (!entryNames.length) {
      continue;
    }

    const fields = linkEntryDisplayFields[key] ?? ['name'];
    const details = await fyo.db.getAll(key, {
      fields,
      filters: { name: ['in', entryNames] },
    });

    entries.value[key] = {
      collapsed,
      details,
    };
  }
}

onMounted(async () => {
  await setLinkedEntries();
  shortcuts?.set(COMPONENT_NAME, ['Escape'], () => emit('close'));
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});

const linkSequence = [
  // Invoices
  ModelNameEnum.SalesInvoice,
  ModelNameEnum.PurchaseInvoice,
  // Stock Transfers
  ModelNameEnum.Shipment,
  ModelNameEnum.PurchaseReceipt,
  // Other Transactional
  ModelNameEnum.Payment,
  ModelNameEnum.JournalEntry,
  ModelNameEnum.StockMovement,
  // Non Transfers
  ModelNameEnum.Party,
  ModelNameEnum.Item,
  ModelNameEnum.Account,
  ModelNameEnum.Location,
  // Ledgers
  ModelNameEnum.AccountingLedgerEntry,
  ModelNameEnum.StockLedgerEntry,
];

const linkEntryDisplayFields: Record<string, string[]> = {
  // Invoices
  [ModelNameEnum.SalesInvoice]: [
    'name',
    'date',
    'party',
    'grandTotal',
    'outstandingAmount',
    'stockNotTransferred',
  ],
  [ModelNameEnum.PurchaseInvoice]: [
    'name',
    'date',
    'party',
    'grandTotal',
    'outstandingAmount',
    'stockNotTransferred',
  ],
  // Stock Transfers
  [ModelNameEnum.Shipment]: ['name', 'date', 'party', 'grandTotal'],
  [ModelNameEnum.PurchaseReceipt]: ['name', 'date', 'party', 'grandTotal'],
  // Other Transactional
  [ModelNameEnum.Payment]: ['name', 'date', 'party', 'amount'],
  [ModelNameEnum.JournalEntry]: ['name', 'date', 'entryType'],
  [ModelNameEnum.StockMovement]: ['name', 'date', 'amount'],
  // Ledgers
  [ModelNameEnum.AccountingLedgerEntry]: [
    'name',
    'date',
    'account',
    'credit',
    'debit',
  ],
  [ModelNameEnum.StockLedgerEntry]: [
    'name',
    'date',
    'item',
    'location',
    'quantity',
  ],
};
</script>

<style scoped>
.pill-container:empty {
  display: none;
}
.linked-title {
  color: var(--foreground) !important;
}
.linked-group-title {
  color: var(--foreground) !important;
}
.linked-group-chevron {
  color: color-mix(in srgb, var(--foreground) 70%, transparent) !important;
  transition: color 0.15s;
}
.linked-group-chevron:hover {
  color: var(--foreground) !important;
}
.linked-entry-date {
  color: color-mix(in srgb, var(--foreground) 60%, transparent) !important;
}
.linked-empty-text {
  color: color-mix(in srgb, var(--foreground) 60%, transparent) !important;
}
</style>
