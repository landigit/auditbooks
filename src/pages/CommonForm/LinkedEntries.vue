<template>
  <div
    class="w-quick-edit bg-white dark:bg-gray-875 border-l border-gray-100 dark:border-gray-800 overflow-y-auto custom-scroll custom-scroll-thumb2 transition-all duration-300"
  >
    <!-- Page Header -->
    <div
      class="flex items-center gap-3 px-6 h-[72px] sticky top-0 bg-white dark:bg-gray-875 border-b border-gray-100 dark:border-gray-800 shadow-sm z-10"
    >
      <UIButton
        variant="ghost"
        size="icon"
        class="w-10 h-10 rounded-md hover:bg-white/5 transition-all text-muted-foreground hover:text-foreground"
        @click="$emit('close')"
      >
        <LucideIcon name="arrow-right" class="w-5 h-5" />
      </UIButton>
      <div class="flex flex-col">
        <p
          class="text-[10px] font-semibold normal-case tracking-[0.2em] text-primary/80"
        >
          {{ t`Connections` }}
        </p>
        <p class="text-sm font-semibold text-foreground/90">
          {{ t`Linked Entries` }}
        </p>
      </div>
    </div>

    <!-- Linked Entry List -->
    <div
      v-if="sequence.length"
      class="w-full flex pl-6 pr-4 pt-4 flex-col gap-6 pb-12"
    >
      <div v-for="sn of sequence" :key="sn" class="flex flex-col gap-3">
        <!-- Header with count and schema label -->
        <div
          class="flex items-center justify-between cursor-pointer group px-2 py-1 rounded-md hover:bg-white/5 transition-all"
          @click="entries[sn].collapsed = !entries[sn].collapsed"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 text-primary"
            >
              <LucideIcon name="link-2" class="w-4 h-4" />
            </div>
            <h2
              class="text-sm text-foreground/80 font-bold select-none tracking-wide"
            >
              {{ fyo.schemaMap[sn]?.label ?? sn }}
              <span
                class="text-xs font-semibold px-2 py-0.5 ml-2 rounded-full bg-white/10 text-muted-foreground"
              >
                {{ entries[sn].details.length }}
              </span>
            </h2>
          </div>
          <LucideIcon
            :name="entries[sn].collapsed ? 'chevron-down' : 'chevron-up'"
            class="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-all"
          />
        </div>

        <!-- Entry list -->
        <div
          v-show="!entries[sn].collapsed"
          class="flex flex-col gap-2 pl-4 border-l border-gray-100 dark:border-gray-800 ml-4 animate-in slide-in-from-top-2 duration-300"
        >
          <!-- Entry -->
          <div
            v-for="e of entries[sn].details"
            :key="String(e.name) + sn"
            class="group p-4 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 hover:shadow-md cursor-pointer transition-all duration-300 relative overflow-hidden"
            @click="routeTo(sn, String(e.name))"
          >
            <!-- Decorative gradient -->
            <div
              class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            ></div>

            <div class="relative flex flex-col gap-3">
              <div class="flex justify-between items-start">
                <div>
                  <p
                    class="font-semibold text-foreground/90 text-sm group-hover:text-primary transition-colors"
                  >
                    {{ e.name }}
                  </p>
                  <p
                    v-if="e.date"
                    class="text-xs text-muted-foreground/60 font-medium mt-0.5"
                  >
                    {{ fyo.format(e.date, 'Date') }}
                  </p>
                </div>
                <LucideIcon
                  name="arrow-up-right"
                  class="w-4 h-4 text-primary/0 group-hover:text-primary/70 transition-all -translate-y-1 group-hover:translate-y-0 translate-x-1 group-hover:translate-x-0"
                />
              </div>

              <div class="flex flex-wrap gap-1.5 pill-container">
                <!-- Credit or Debit (GLE) -->
                <p
                  v-if="isPesa(e.credit) && e.credit.isPositive()"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ t`Cr. ${fyo.format(e.credit, 'Currency')}` }}
                </p>
                <p
                  v-else-if="isPesa(e.debit) && e.debit.isPositive()"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ t`Dr. ${fyo.format(e.debit, 'Currency')}` }}
                </p>

                <!-- Party or EntryType or Account -->
                <p
                  v-if="e.party || e.entryType || e.account"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ e.party || e.entryType || e.account }}
                </p>

                <p
                  v-if="e.item"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ e.item }}
                </p>
                <p
                  v-if="e.location"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ e.location }}
                </p>

                <!-- Amounts -->
                <p
                  v-if="
                    isPesa(e.outstandingAmount) &&
                    e.outstandingAmount.isPositive()
                  "
                  class="pill text-[10px] font-bold px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md whitespace-nowrap"
                >
                  {{ t`Unpaid ${fyo.format(e.outstandingAmount, 'Currency')}` }}
                </p>
                <p
                  v-else-if="isPesa(e.grandTotal) && e.grandTotal.isPositive()"
                  class="pill text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md whitespace-nowrap"
                >
                  {{ fyo.format(e.grandTotal, 'Currency') }}
                </p>
                <p
                  v-else-if="isPesa(e.amount) && e.amount.isPositive()"
                  class="pill text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md whitespace-nowrap"
                >
                  {{ fyo.format(e.amount, 'Currency') }}
                </p>

                <!-- Quantities -->
                <p
                  v-if="e.stockNotTransferred"
                  class="pill text-[10px] font-bold px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-md whitespace-nowrap"
                >
                  {{
                    t`Pending qty. ${fyo.format(e.stockNotTransferred, 'Float')}`
                  }}
                </p>
                <p
                  v-else-if="typeof e.quantity === 'number' && e.quantity"
                  class="pill text-[10px] font-bold px-2 py-1 bg-white/10 text-foreground/70 rounded-md whitespace-nowrap"
                >
                  {{ t`Qty. ${fyo.format(e.quantity, 'Float')}` }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center justify-center pt-24 pb-12 text-center opacity-50"
    >
      <div
        class="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-4 transition-all hover:bg-white/10 hover:scale-110 border border-white/5"
      >
        <LucideIcon name="link-2-off" class="w-8 h-8 text-muted-foreground" />
      </div>
      <p class="text-sm font-bold text-foreground">
        {{ t`No linked entries found` }}
      </p>
      <p
        class="text-[10px] normal-case font-bold tracking-normal text-muted-foreground mt-2"
      >
        {{ t`Try adding related documents` }}
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { Doc } from 'fyo/model/doc';
import { isPesa } from 'fyo/utils';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import { ModelNameEnum } from 'models/types';
import LucideIcon from 'src/components/LucideIcon.vue';
import { getLinkedEntries } from 'src/utils/doc';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { PropType, defineComponent, inject } from 'vue';

const COMPONENT_NAME = 'LinkedEntries';

export default defineComponent({
  components: { LucideIcon },
  props: { doc: { type: Object as PropType<Doc>, required: true } },
  emits: ['close'],
  setup() {
    return { shortcuts: inject(shortcutsKey), fyo, t };
  },
  data() {
    return { entries: {} } as {
      entries: Record<
        string,
        { collapsed: boolean; details: Record<string, unknown>[] }
      >;
    };
  },
  computed: {
    sequence(): string[] {
      const seq: string[] = linkSequence.filter(
        (s) => !!this.entries[s]?.details?.length
      );

      for (const s in this.entries) {
        if (seq.includes(s)) {
          continue;
        }
        seq.push(s);
      }

      return seq;
    },
  },
  async mounted() {
    await this.setLinkedEntries();
    this.shortcuts?.set(COMPONENT_NAME, ['Escape'], () => this.$emit('close'));
  },
  unmounted() {
    this.shortcuts?.delete(COMPONENT_NAME);
  },
  methods: {
    isPesa,
    async routeTo(schemaName: string, name: string) {
      const route = getFormRoute(schemaName, name);
      await routeTo(route);
    },
    async setLinkedEntries() {
      const linkedEntries = await getLinkedEntries(this.doc);
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

        this.entries[key] = {
          collapsed,
          details,
        };
      }
    },
  },
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
</style>
