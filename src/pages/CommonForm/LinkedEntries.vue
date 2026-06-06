<template>
  <view
    class="w-quick-edit bg-surface border-l border-border overflow-y-auto custom-scroll custom-scroll-thumb2"
  >
    <!-- Page Header -->
    <view
      class="relative flex items-center justify-center px-4 h-row-largest sticky top-0 bg-surface border-b border-border"
      style="z-index: 1"
    >
      <Button :icon="true" class="absolute left-4" @tap="emit('close')">
        <lucide-icon name="x" class="w-4 h-4" />
      </Button>
      <text class="text-xl font-semibold text-description">
        {{ t`Linked Entries` }}
      </text>
    </view>

    <!-- Loading Spinner -->
    <view
      v-if="loading"
      class="flex flex-col items-center justify-center p-8 text-description h-64"
    >
      <view
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"
      ></view>
      <text class="text-sm text-description">{{
        t`Loading linked entries...`
      }}</text>
    </view>

    <!-- Linked Entry List -->
    <view
      v-else-if="sequence.length"
      class="w-full overflow-y-auto custom-scroll custom-scroll-thumb2 border-t border-border"
    >
      <view
        v-for="sn of sequence"
        :key="sn"
        class="border-b border-border p-4 overflow-auto"
      >
        <!-- Header with count and schema label -->
        <view
          class="flex justify-between cursor-pointer"
          :class="entries[sn].collapsed ? '' : 'pb-4'"
          @tap="entries[sn].collapsed = !entries[sn].collapsed"
        >
          <text class="text-base text-description font-semibold select-none">
            {{ fyo.schemaMap[sn]?.label ?? sn
            }}<text class="font-normal">{{
              ` – ${entries[sn].details.length}`
            }}</text>
          </text>
          <lucide-icon
            :name="entries[sn].collapsed ? 'chevron-up' : 'chevron-down'"
            class="w-4 h-4 text-description"
          />
        </view>

        <!-- Entry list -->
        <view
          v-show="!entries[sn].collapsed"
          class="entry-container rounded-md border border-border overflow-hidden"
        >
          <!-- Entry -->
          <view
            v-for="e of entries[sn].details"
            :key="String(e.name) + sn"
            class="p-2 text-sm cursor-pointer border-b last:border-0 border-border hover:bg-surface-hover"
            @tap="routeToEntry(sn, String(e.name))"
          >
            <view class="flex justify-between">
              <!-- Name -->
              <text class="font-semibold text-main">
                {{ e.name }}
              </text>

              <!-- Date -->
              <text v-if="e.date" class="text-xs text-description">
                {{ fyo.format(e.date, 'Date') }}
              </text>
            </view>
            <view class="flex gap-2 mt-1 pill-container flex-wrap">
              <!-- Credit or Debit (GLE) -->
              <text
                v-if="isPesa(e.credit) && e.credit.isPositive()"
                class="pill"
                :class="colorClass('draft')"
              >
                {{ t`Cr. ${fyo.format(e.credit, 'Currency')}` }}
              </text>
              <text
                v-else-if="isPesa(e.debit) && e.debit.isPositive()"
                class="pill"
                :class="colorClass('draft')"
              >
                {{ t`Dr. ${fyo.format(e.debit, 'Currency')}` }}
              </text>

              <!-- Party or EntryType or Account -->
              <text
                v-if="e.party || e.entryType || e.account"
                class="pill"
                :class="colorClass('draft')"
              >
                {{ e.party || e.entryType || e.account }}
              </text>

              <text v-if="e.item" class="pill" :class="colorClass('draft')">
                {{ e.item }}
              </text>
              <text v-if="e.location" class="pill" :class="colorClass('draft')">
                {{ e.location }}
              </text>

              <!-- Amounts -->
              <text
                v-if="
                  isPesa(e.outstandingAmount) &&
                  e.outstandingAmount.isPositive()
                "
                class="pill no-scrollbar"
                :class="colorClass('unpaid')"
              >
                {{ t`Unpaid ${fyo.format(e.outstandingAmount, 'Currency')}` }}
              </text>
              <text
                v-else-if="isPesa(e.grandTotal) && e.grandTotal.isPositive()"
                class="pill no-scrollbar"
                :class="colorClass('success')"
              >
                {{ fyo.format(e.grandTotal, 'Currency') }}
              </text>
              <text
                v-else-if="isPesa(e.amount) && e.amount.isPositive()"
                class="pill no-scrollbar"
                :class="colorClass('success')"
              >
                {{ fyo.format(e.amount, 'Currency') }}
              </text>

              <!-- Quantities -->
              <text
                v-if="e.stockNotTransferred"
                class="pill no-scrollbar"
                :class="colorClass('unpaid')"
              >
                {{
                  t`Pending qty. ${fyo.format(e.stockNotTransferred, 'Float')}`
                }}
              </text>
              <text
                v-else-if="typeof e.quantity === 'number' && e.quantity"
                class="pill no-scrollbar"
                :class="colorClass('draft')"
              >
                {{ t`Qty. ${fyo.format(e.quantity, 'Float')}` }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <text v-else class="p-4 text-sm text-description">
      {{ t`No linked entries found` }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import { isPesa } from 'fyo/utils';
import { ModelNameEnum } from 'models/types';
import Button from 'src/components/Button.vue';
import { getBgTextColorClass } from 'src/utils/colors';
import { getLinkedEntries } from 'src/utils/doc';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

const COMPONENT_NAME = 'LinkedEntries';

// Define Props & Emits
const props = defineProps<{
  doc: Doc;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// State definition
const shortcuts = inject(shortcutsKey);
const loading = ref(true);
const entries = ref<
  Record<string, { collapsed: boolean; details: Record<string, any>[] }>
>({});

const colorClass = getBgTextColorClass;

// Computed properties
const sequence = computed<string[]>(() => {
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

// Methods
const routeToEntry = async (schemaName: string, name: string) => {
  const route = getFormRoute(schemaName, name);
  await routeTo(route);
};

const setLinkedEntries = async () => {
  try {
    const linkedEntries = await getLinkedEntries(props.doc);

    // Fetch all details in parallel using Promise.all!
    const keys = Object.keys(linkedEntries);
    const fetchPromises = keys.map(async (key) => {
      const entryNames = linkedEntries[key];
      if (!entryNames || !entryNames.length) {
        return null;
      }

      const fields = linkEntryDisplayFields[key] ?? ['name'];
      const details = await fyo.db.getAll(key, {
        fields,
        filters: { name: ['in', entryNames] },
      });

      return {
        key,
        collapsed: false,
        details,
      };
    });

    const results = await Promise.all(fetchPromises);

    const newEntries: Record<
      string,
      { collapsed: boolean; details: Record<string, any>[] }
    > = {};
    for (const res of results) {
      if (res) {
        newEntries[res.key] = {
          collapsed: res.collapsed,
          details: res.details,
        };
      }
    }

    entries.value = newEntries;
  } catch (error) {
    console.error('Error fetching linked entries:', error);
  } finally {
    loading.value = false;
  }
};

// Lifecycles
onMounted(async () => {
  await setLinkedEntries();
  shortcuts?.set(COMPONENT_NAME, ['Escape'], () => emit('close'));
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});

// Layout sequence and mappings
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
</style>
