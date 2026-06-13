<template>
  <div class="flex flex-col h-full overflow-hidden">
    <PageHeader :title="title">
      <Button
        v-if="
          schemaName === 'Item' &&
          (!isSelectionMode || (isSelectionMode && selectedItems.length === 0))
        "
        @click="toggleSelectionMode"
      >
        <feather-icon name="check-circle" class="w-4 h-4 me-1.5" />
        {{ t`Select` }}
      </Button>
      <div
        v-if="
          isSelectionMode && schemaName === 'Item' && selectedItems.length > 0
        "
        class="relative"
      >
        <Button class="w-40" @click="toggleDropdown">
          <feather-icon name="plus" class="w-4 h-4 me-1.5" />
          Create
        </Button>
        <div
          v-if="showDropdown"
          class="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 w-40"
        >
          <div
            v-for="option in actionOptions"
            :key="option.value"
            class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            @click="createInvoice(option.value)"
          >
            {{ option.label }}
          </div>
        </div>
      </div>
      <Button ref="exportButtonRef" :icon="false" @click="openExportModal = true">
        <feather-icon name="download" class="w-4 h-4 me-1.5" />
        {{ t`Export` }}
      </Button>
      <FilterDropdown
        ref="filterDropdownRef"
        :schema-name="schemaName"
        @change="applyFilter"
      />
      <Button
        v-if="canCreate"
        ref="makeNewDocButtonRef"
        :icon="true"
        type="primary"
        :padding="false"
        class="px-3"
        @click="handleMakeNewDoc"
      >
        <feather-icon name="plus" class="w-4 h-4" />
      </Button>
    </PageHeader>
    <List
      ref="listRef"
      :schema-name="schemaName"
      :list-config="listConfig"
      :filters="filters"
      :can-create="canCreate"
      :is-selection-mode="isSelectionMode"
      class="flex-1 flex h-full"
      @open-doc="openDoc"
      @updated-data="updatedData"
      @make-new-doc="handleMakeNewDoc"
      @selected-items-changed="updateSelectedItems"
    />
    <Modal :open-modal="openExportModal" @closemodal="openExportModal = false">
      <ExportWizard
        class="w-form"
        :schema-name="schemaName"
        :title="pageTitle"
        :list-filters="listFilters"
      />
    </Modal>
  </div>
</template>
<script setup lang="ts">
import Button from 'src/components/Button.vue';
import ExportWizard from 'src/components/ExportWizard.vue';
import FilterDropdown from 'src/components/FilterDropdown.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';
import List from './List.vue';
import { useListView } from './useListView';
import { useApp } from 'src/composables/useApp.js';

const props = withDefaults(
  defineProps<{
    schemaName: string;
    filters?: Record<string, any>;
    pageTitle?: string;
  }>(),
  {
    filters: undefined,
    pageTitle: '',
  }
);

const { t } = useApp();

const {
  listConfig,
  openExportModal,
  listFilters,
  isSelectionMode,
  showDropdown,
  selectedItems,
  listRef,
  makeNewDocButtonRef,
  exportButtonRef,
  filterDropdownRef,
  title,
  canCreate,
  actionOptions,
  updatedData,
  openDoc,
  handleMakeNewDoc,
  applyFilter,
  toggleSelectionMode,
  toggleDropdown,
  createInvoice,
  updateSelectedItems,
} = useListView(props);
</script>

