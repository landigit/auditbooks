<template>
  <Dialog
    :open="modalStatus"
    @update:open="$emit('toggleModal', 'ReturnSalesInvoice')"
  >
    <DialogContent
      class="sm:max-w-[700px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="rotate-ccw" class="w-4 h-4 text-primary" />
              {{ t`Return Invoices` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Select invoice to return` }}
            </p>
          </div>
        </div>

        <!-- Search -->
        <div class="px-8 pt-6 pb-2">
          <div class="relative group">
            <Input
              v-model="invoiceSearchTerm"
              type="text"
              :placeholder="t`Search by Invoice Name...`"
              class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all pl-12 font-bold"
              @keydown.enter="handleSearchEnter"
            />
            <LucideIcon
              name="search"
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary/50 transition-colors"
            />
          </div>
        </div>

        <!-- Table Content -->
        <div class="px-8 py-4">
          <div
            class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
          >
            <Table>
              <TableHeader class="bg-gray-50 dark:bg-gray-890">
                <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                  <TableHead
                    v-for="df in tableFields"
                    :key="df.fieldname"
                    class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4"
                  >
                    {{ df.label }}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="row in paginatedInvoices"
                  :key="row.name"
                  class="cursor-pointer border-gray-100 dark:border-gray-800 hover:bg-primary/5 transition-colors group"
                  @click="returnInvoice(row as SalesInvoice)"
                >
                  <TableCell
                    v-for="df in tableFields"
                    :key="df.fieldname"
                    class="py-4"
                  >
                    <div
                      v-if="df.fieldtype === 'Currency'"
                      class="font-bold text-sm text-primary dark:text-primary"
                    >
                      {{ row[df.fieldname] }}
                    </div>
                    <div
                      v-else-if="df.fieldname === 'name'"
                      class="font-bold text-sm text-gray-900 dark:text-gray-100 normal-case tracking-tight"
                    >
                      {{ row[df.fieldname] }}
                    </div>
                    <div
                      v-else
                      class="text-sm text-gray-600 dark:text-gray-300 font-medium"
                    >
                      {{ row[df.fieldname] }}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div
              v-if="filteredInvoices.length === 0"
              class="py-20 text-center space-y-3"
            >
              <div
                class="w-16 h-16 rounded-lg bg-gray-50 dark:bg-gray-890 flex items-center justify-center mx-auto"
              >
                <LucideIcon
                  name="file-question"
                  class="w-8 h-8 text-gray-300 dark:text-gray-600"
                />
              </div>
              <p
                class="text-sm font-bold text-gray-400 dark:text-gray-500 normal-case tracking-normal"
              >
                {{ t`No Invoices Found` }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer / Pagination -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <Paginator
            :item-count="filteredInvoices.length"
            :allowed-counts="[20, 40, -1]"
            class="pagination-modern"
            @index-change="setPageIndices"
          />

          <UIButton
            variant="outline"
            class="h-12 px-8 rounded-md font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 hover:border-gray-200 dark:border-gray-700 transition-all text-red-400"
            @click="$emit('toggleModal', 'ReturnSalesInvoice')"
          >
            {{ t`Close` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import {
  Dialog,
  DialogContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { defineComponent, inject } from 'vue';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import { Money } from 'pesa';
import Paginator from 'src/components/Paginator.vue';
import { t } from 'fyo';

export default defineComponent({
  name: 'ReturnSalesInvoice',
  components: {
    Dialog,
    DialogContent,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    LucideIcon,
    Paginator,
  },
  props: {
    modalStatus: Boolean,
  },
  emits: ['toggleModal', 'selectedReturnInvoice'],
  setup() {
    return {
      t,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      returnedInvoices: [] as SalesInvoice[],
      invoiceSearchTerm: '',
      pageStart: 0,
      pageEnd: 20,
    };
  },
  computed: {
    tableFields() {
      return [
        {
          fieldname: 'name',
          label: t`Invoice`,
          fieldtype: 'Link',
        },
        {
          fieldname: 'party',
          fieldtype: 'Link',
          label: t`Customer`,
        },
        {
          fieldname: 'date',
          label: t`Date`,
          fieldtype: 'Date',
        },
        {
          fieldname: 'grandTotal',
          label: t`Total`,
          fieldtype: 'Currency',
        },
      ] as Field[];
    },
    filteredInvoices() {
      return this.returnedInvoices.filter((invoice) =>
        (invoice.name as string)
          .toLowerCase()
          .includes(this.invoiceSearchTerm.toLowerCase())
      );
    },
    paginatedInvoices() {
      return this.filteredInvoices.slice(this.pageStart, this.pageEnd);
    },
  },
  watch: {
    async modalStatus(newVal) {
      if (newVal) {
        await this.setReturnedInvoices();
      }
    },
    invoiceSearchTerm() {
      this.pageStart = 0;
      this.pageEnd = this.pageEnd - this.pageStart || 20;
    },
  },
  async mounted() {
    await this.setReturnedInvoices();
  },
  async activated() {
    await this.setReturnedInvoices();
  },

  methods: {
    returnInvoice(row: SalesInvoice) {
      this.$emit('selectedReturnInvoice', row.name);
      this.$emit('toggleModal', 'ReturnSalesInvoice');
    },
    handleSearchEnter() {
      if (this.filteredInvoices.length === 1) {
        this.returnInvoice(this.filteredInvoices[0] as SalesInvoice);
      }
    },
    setPageIndices({ start, end }: { start: number; end: number }) {
      this.pageStart = start;
      this.pageEnd = end;
    },
    async setReturnedInvoices() {
      const allInvoices = await this.fyo.db.getAll(ModelNameEnum.SalesInvoice, {
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
      this.returnedInvoices = allInvoices.filter((inv) =>
        returnedInvoiceNames.includes(inv.name)
      ) as SalesInvoice[];
    },
  },
});
</script>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 4px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(var(--primary-rgb), 0.1);
  border-radius: 10px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--primary-rgb), 0.2);
}
</style>
