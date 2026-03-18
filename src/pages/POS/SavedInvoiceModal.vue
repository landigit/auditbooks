<template>
  <Dialog :open="true" @update:open="$emit('toggleModal', 'SavedInvoice')">
    <DialogContent
      class="sm:max-w-[800px] p-0 overflow-hidden border-none bg-transparent shadow-none"
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
              <LucideIcon name="file-text" class="w-4 h-4 text-primary" />
              {{ t`Invoice Explorer` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ t`Browse and select existing invoices` }}
            </p>
          </div>
        </div>

        <div class="p-8 space-y-6">
          <!-- Search and Filter -->
          <div class="flex gap-4">
            <div class="relative flex-1 group">
              <Input
                v-model="invoiceSearchTerm"
                type="text"
                :placeholder="t`Search by Invoice Name...`"
                class="h-14 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all pl-12 font-bold"
                @keydown.enter="handleEnterKey"
              />
              <LucideIcon
                name="search"
                class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary/50 transition-colors"
              />
            </div>

            <Tabs v-model="savedInvoiceListTab" class="w-[300px]">
              <TabsList
                class="grid w-full grid-cols-2 h-14 bg-gray-50 dark:bg-gray-890 border border-gray-100 dark:border-gray-800 p-1.5 rounded-lg"
              >
                <TabsTrigger
                  value="saved"
                  class="rounded-md font-semibold normal-case tracking-normal text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  {{ t`Saved` }}
                </TabsTrigger>
                <TabsTrigger
                  value="submitted"
                  class="rounded-md font-semibold normal-case tracking-normal text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  {{ t`Submitted` }}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <!-- Table Content -->
          <div
            class="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-890"
          >
            <ScrollArea class="h-[50vh]">
              <Table>
                <TableHeader class="bg-gray-50 dark:bg-gray-890 sticky top-0 z-10">
                  <TableRow class="hover:bg-transparent border-gray-100 dark:border-gray-800">
                    <TableHead
                      v-for="df in tableFields"
                      :key="df.fieldname"
                      class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 py-4 px-6"
                    >
                      {{ df.label }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="row in filteredInvoices"
                    :key="row.name"
                    class="cursor-pointer border-gray-100 dark:border-gray-800 hover:bg-primary/5 transition-colors group"
                    @click="$emit('selectedInvoiceName', row)"
                  >
                    <TableCell
                      v-for="df in tableFields"
                      :key="df.fieldname"
                      class="py-4 px-6"
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
            </ScrollArea>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-2 h-2 rounded-full"
              :class="
                savedInvoiceListTab === 'saved'
                  ? 'bg-amber-400'
                  : 'bg-green-400'
              "
            ></div>
            <span
              class="text-[10px] font-semibold normal-case tracking-[0.2em] text-gray-500 dark:text-gray-400"
            >
              {{
                savedInvoiceListTab === 'saved'
                  ? t`Draft Invoices`
                  : t`Outstanding Invoices`
              }}
            </span>
          </div>

          <UIButton
            variant="outline"
            class="h-12 px-8 rounded-md font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 hover:border-gray-200 dark:border-gray-700 transition-all text-red-400"
            @click="$emit('toggleModal', 'SavedInvoice')"
          >
            {{ t`Close Explorer` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import { t } from 'fyo';
import {
  Dialog,
  DialogContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
} from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import { Money } from 'pesa';

export default defineComponent({
  name: 'SavedInvoiceModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    ScrollArea,
    Tabs,
    TabsList,
    TabsTrigger,
    LucideIcon,
  },
  props: {
    modalStatus: Boolean,
  },
  emits: ['toggleModal', 'selectedInvoiceName'],
  setup() {
    return {
      t,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      savedInvoiceListTab: 'saved' as 'saved' | 'submitted',
      savedInvoices: [] as SalesInvoice[],
      submittedInvoices: [] as SalesInvoice[],
      invoiceSearchTerm: '',
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
          label: t`Customer`,
          fieldtype: 'Link',
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
      const invoices =
        this.savedInvoiceListTab === 'saved'
          ? this.savedInvoices
          : this.submittedInvoices;
      return invoices.filter((invoice) =>
        (invoice.name as string)
          .toLowerCase()
          .includes(this.invoiceSearchTerm.toLowerCase())
      );
    },
  },
  watch: {
    async modalStatus(newVal) {
      if (newVal) {
        await this.refreshData();
      }
    },
  },
  async mounted() {
    await this.refreshData();
  },
  methods: {
    async refreshData() {
      await Promise.all([this.setSavedInvoices(), this.setSubmittedInvoices()]);
    },
    async setSavedInvoices() {
      this.savedInvoices = (await this.fyo.db.getAll(
        ModelNameEnum.SalesInvoice,
        {
          fields: [],
          filters: { isPOS: true, submitted: false },
        }
      )) as SalesInvoice[];
    },
    async setSubmittedInvoices() {
      const invoices = (await this.fyo.db.getAll(ModelNameEnum.SalesInvoice, {
        fields: [],
        filters: { isPOS: true, submitted: true, returnAgainst: null },
      })) as SalesInvoice[];

      this.submittedInvoices = invoices.filter(
        (invoice) => !(invoice.outstandingAmount as Money).isZero()
      );
    },
    handleEnterKey() {
      if (this.filteredInvoices.length === 1) {
        this.$emit('selectedInvoiceName', this.filteredInvoices[0]);
      }
    },
  },
});
</script>
