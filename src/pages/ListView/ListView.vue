<template>
  <div class="flex flex-col h-full">
    <PageHeader :title="title">
      <UIButton
        v-if="
          schemaName === 'Item' &&
          (!isSelectionMode || (isSelectionMode && selectedItems.length === 0))
        "
        variant="outline"
        @click="toggleSelectionMode"
      >
        {{ t`Select` }}
      </UIButton>
      <div
        v-if="
          isSelectionMode && schemaName === 'Item' && selectedItems.length > 0
        "
        class="relative"
      >
        <UIButton variant="default" class="w-40" @click="toggleDropdown">
          Create
        </UIButton>
        <div
          v-if="showDropdown"
          class="absolute top-full mt-1 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-md shadow-lg z-20 w-40 overflow-hidden"
        >
          <div
            v-for="option in actionOptions"
            :key="option.value"
            class="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm font-medium transition-colors"
            @click="createInvoice(option.value)"
          >
            {{ option.label }}
          </div>
        </div>
      </div>
      <UIButton
        ref="exportButton"
        variant="outline"
        @click="openExportModal = true"
      >
        <LucideIcon name="download" class="w-4 h-4 mr-2" />
        {{ t`Export` }}
      </UIButton>
      <FilterDropdown
        ref="filterDropdown"
        :schema-name="schemaName"
        @change="applyFilter"
      />
      <UIButton
        v-if="canCreate"
        ref="makeNewDocButton"
        variant="default"
        size="icon"
        @click="handleMakeNewDoc"
      >
        <LucideIcon name="plus" class="w-4 h-4" />
      </UIButton>
    </PageHeader>
    <List
      ref="list"
      :schema-name="schemaName"
      :list-config="listConfig"
      :filters="filters"
      :can-create="canCreate"
      :is-selection-mode="isSelectionMode"
      class="flex-1 flex h-full"
      @open-doc="openDoc"
      @updated-data="updatedData"
      @make-new-doc="makeNewDoc"
      @selected-items-changed="updateSelectedItems"
    />
    <Dialog :open="openExportModal" @update:open="openExportModal = $event">
      <DialogContent
        class="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl glass"
      >
        <ExportWizard
          :schema-name="schemaName"
          :title="pageTitle"
          :list-filters="listFilters"
          @close="openExportModal = false"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
<script lang="ts">
import { Field } from 'schemas/types';
import { Dialog, DialogContent, UIButton } from 'src/components/ui';
import LucideIcon from 'src/components/LucideIcon.vue';
import ExportWizard from 'src/components/ExportWizard.vue';
import FilterDropdown from 'src/components/FilterDropdown.vue';
import PageHeader from 'src/components/PageHeader.vue';

import { fyo } from 'src/initFyo';
import { shortcutsKey } from 'src/utils/injectionKeys';
import {
  docsPathMap,
  getCreateFiltersFromListViewFilters,
} from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import { defineComponent, inject, ref } from 'vue';
import List from './List.vue';
import { Money } from 'pesa';
import { ModelNameEnum } from 'models/types';

export default defineComponent({
  name: 'ListView',
  components: {
    PageHeader,
    List,
    LucideIcon,
    FilterDropdown,
    Dialog,
    DialogContent,
    ExportWizard,
  },
  props: {
    schemaName: { type: String, required: true },
    filters: { type: Object, default: undefined },
    pageTitle: { type: String, default: '' },
  },
  setup() {
    return {
      shortcuts: inject(shortcutsKey),
      list: ref<InstanceType<typeof List> | null>(null),
      makeNewDocButton: ref<InstanceType<typeof UIButton> | null>(null),
      exportButton: ref<InstanceType<typeof UIButton> | null>(null),
      filterDropdown: ref<InstanceType<typeof FilterDropdown> | null>(null),
    };
  },
  data() {
    return {
      listConfig: undefined,
      openExportModal: false,
      listFilters: {},
      isSelectionMode: false,
      showDropdown: false,
      selectedItems: [] as string[],
    } as {
      listConfig: undefined | ReturnType<typeof getListConfig>;
      openExportModal: boolean;
      listFilters: QueryFilter;
      isSelectionMode: boolean;
      showDropdown: boolean;
      selectedItems: string[];
    };
  },
  computed: {
    context(): string {
      return 'ListView-' + this.schemaName;
    },
    title(): string {
      if (this.pageTitle) {
        return this.pageTitle;
      }

      return fyo.schemaMap[this.schemaName]?.label ?? this.schemaName;
    },
    fields(): Field[] {
      return fyo.schemaMap[this.schemaName]?.fields ?? [];
    },
    canCreate(): boolean {
      return fyo.schemaMap[this.schemaName]?.create !== false;
    },
    actionOptions(): { value: string; label: string }[] {
      return [
        { value: 'SalesQuote', label: 'Sales Quote' },
        { value: 'SalesInvoice', label: 'Sales Invoice' },
        { value: 'PurchaseInvoice', label: 'Purchase Invoice' },
      ];
    },
  },
  activated() {
    this.listConfig = getListConfig(this.schemaName);
    docsPathRef.value =
      docsPathMap[this.schemaName] ?? docsPathMap.Entries ?? '';

    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.lv = this;
    }

    this.setShortcuts();
  },
  deactivated() {
    docsPathRef.value = '';
    this.shortcuts?.delete(this.context);
  },
  methods: {
    setShortcuts() {
      if (!this.shortcuts) {
        return;
      }

      this.shortcuts.pmod.set(this.context, ['KeyN'], () =>
        this.makeNewDocButton?.$el.click()
      );
      this.shortcuts.pmod.set(this.context, ['KeyE'], () =>
        this.exportButton?.$el.click()
      );
    },
    updatedData(listFilters: QueryFilter) {
      this.listFilters = listFilters;
    },
    async openDoc(name: string) {
      const route = getFormRoute(this.schemaName, name);
      await routeTo(route);
    },
    async makeNewDoc() {
      if (!this.canCreate) {
        return;
      }

      const filters = getCreateFiltersFromListViewFilters(this.filters ?? {});
      const doc = fyo.doc.getNewDoc(this.schemaName, filters);
      const route = getFormRoute(this.schemaName, doc.name!);
      await routeTo(route);
    },
    async handleMakeNewDoc() {
      await this.makeNewDoc();
    },
    applyFilter(filters: QueryFilter) {
      this.list?.updateData(filters);
    },
    toggleSelectionMode() {
      this.isSelectionMode = !this.isSelectionMode;
      if (!this.isSelectionMode) {
        this.showDropdown = false;
        this.selectedItems = [];
      }
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    async createInvoice(value: string) {
      if (
        value === ModelNameEnum.SalesQuote ||
        value === ModelNameEnum.SalesInvoice ||
        value === ModelNameEnum.PurchaseInvoice
      ) {
        const doc = fyo.doc.getNewDoc(value);

        for (const itemName of this.selectedItems) {
          const itemDoc = await fyo.doc.getDoc('Item', itemName);

          const itemRow = {
            item: itemName,
            rate: (itemDoc.rate as Money) || fyo.pesa(0),
            quantity: 1,
          };

          await doc.append('items', itemRow);
        }

        const route = getFormRoute(value, doc.name!);
        await routeTo(route);
        this.selectedItems = [];
        this.isSelectionMode = false;
        this.showDropdown = false;
      }
    },

    updateSelectedItems(selected: string[]) {
      this.selectedItems = selected;
    },
  },
});

function getListConfig(schemaName: string) {
  const listConfig = fyo.models[schemaName]?.getListViewSettings?.(fyo);
  if (listConfig?.columns === undefined) {
    return {
      columns: ['name'],
    };
  }
  return listConfig;
}
</script>
