<template>
  <view v-if="!isLynx" class="flex-1 flex flex-col h-full w-full">
    <view class="flex flex-col h-full w-full overflow-hidden">
      <PageHeader :title="title">
        <Button
          v-if="
            schemaName === 'Item' &&
            (!isSelectionMode ||
              (isSelectionMode && selectedItems.length === 0))
          "
          @tap="toggleSelectionMode"
        >
          {{ t`Select` }}
        </Button>
        <view
          v-if="
            isSelectionMode && schemaName === 'Item' && selectedItems.length > 0
          "
          class="relative"
        >
          <Button class="w-40" @tap="toggleDropdown"> Create </Button>
          <view
            v-if="showDropdown"
            class="absolute top-full mt-1 bg-surface border border-border rounded shadow-lg z-10 w-40"
          >
            <view
              v-for="option in actionOptions"
              :key="option.value"
              class="px-4 py-2 hover:bg-surface-hover cursor-pointer text-sm"
              @tap="createInvoice(option.value)"
            >
              {{ option.label }}
            </view>
          </view>
        </view>
        <Button
          ref="exportButton"
          :icon="false"
          class="hidden md:inline-flex"
          @tap="openExportModal = true"
        >
          {{ t`Export` }}
        </Button>
        <FilterDropdown
          ref="filterDropdown"
          :schema-name="schemaName"
          @change="applyFilter"
        />
        <Button
          v-if="canCreate"
          ref="makeNewDocButton"
          :icon="true"
          type="primary"
          :padding="false"
          class="px-3"
          @tap="handleMakeNewDoc"
        >
          <LucideIcon name="plus" class="w-4 h-4" />
        </Button>
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
      <Modal
        :open-modal="openExportModal"
        @closemodal="openExportModal = false"
      >
        <ExportWizard
          class="w-form"
          :schema-name="schemaName"
          :title="pageTitle"
          :list-filters="listFilters"
        />
      </Modal>
    </view>
  </view>
  <view v-else class="flex flex-col h-full bg-canvas">
    <!-- Native Header -->
    <PageHeader :title="title">
      <view
        v-if="canCreate"
        class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer"
        @tap="handleMakeNewDoc"
      >
        <text class="text-white text-lg font-bold">+</text>
      </view>
    </PageHeader>
    <List
      ref="list"
      :schema-name="schemaName"
      :list-config="listConfig"
      :filters="filters"
      :can-create="canCreate"
      :is-selection-mode="isSelectionMode"
      class="flex-1"
      @open-doc="openDoc"
      @updated-data="updatedData"
      @make-new-doc="makeNewDoc"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated, inject } from 'vue';
import { Field } from 'schemas/types';
import Button from 'src/components/Button.vue';
import ExportWizard from 'src/components/ExportWizard.vue';
import FilterDropdown from 'src/components/FilterDropdown.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';

import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { shortcutsKey } from 'src/utils/injectionKeys';
import {
  docsPathMap,
  getCreateFiltersFromListViewFilters,
} from 'src/utils/misc';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import { useAppStore } from 'src/stores/app';
import List from './List.vue';
import { Money } from 'pesa';
import { ModelNameEnum } from 'models/types';
import LucideIcon from 'src/components/LucideIcon.vue';

// Define Props
const props = withDefaults(
  defineProps<{
    schemaName: string;
    filters?: Record<string, any>;
    pageTitle?: string;
  }>(),
  {
    pageTitle: '',
  }
);

// Inject Dependencies
const shortcuts = inject(shortcutsKey);
const store = useAppStore();

// Template Refs
const list = ref<InstanceType<typeof List> | null>(null);
const makeNewDocButton = ref<InstanceType<typeof Button> | null>(null);
const exportButton = ref<InstanceType<typeof Button> | null>(null);
const filterDropdown = ref<InstanceType<typeof FilterDropdown> | null>(null);

// Reactive State
const listConfig = ref<any>(undefined);
const openExportModal = ref(false);
const listFilters = ref<Record<string, any>>({});
const isSelectionMode = ref(false);
const showDropdown = ref(false);
const selectedItems = ref<string[]>([]);

// Computed Properties
const context = computed(() => {
  return 'ListView-' + props.schemaName;
});

const title = computed(() => {
  if (props.pageTitle) {
    return props.pageTitle;
  }
  return fyo.schemaMap[props.schemaName]?.label ?? props.schemaName;
});

const fields = computed<Field[]>(() => {
  return fyo.schemaMap[props.schemaName]?.fields ?? [];
});

const canCreate = computed<boolean>(() => {
  return fyo.schemaMap[props.schemaName]?.create !== false;
});

const actionOptions = computed(() => {
  return [
    { value: 'SalesQuote', label: 'Sales Quote' },
    { value: 'SalesInvoice', label: 'Sales Invoice' },
    { value: 'PurchaseInvoice', label: 'Purchase Invoice' },
  ];
});

// Methods
const setShortcuts = () => {
  if (!shortcuts) {
    return;
  }

  shortcuts.pmod.set(context.value, ['KeyN'], () =>
    makeNewDocButton.value?.$el.click()
  );
  shortcuts.pmod.set(context.value, ['KeyE'], () =>
    exportButton.value?.$el.click()
  );
};

const updatedData = (filtersVal: QueryFilter) => {
  listFilters.value = filtersVal;
};

const openDoc = async (name: string) => {
  const route = getFormRoute(props.schemaName, name);
  await routeTo(route);
};

const makeNewDoc = async () => {
  if (!canCreate.value) {
    return;
  }

  const filters = getCreateFiltersFromListViewFilters(props.filters ?? {});
  const doc = fyo.doc.getNewDoc(props.schemaName, filters);
  const route = getFormRoute(props.schemaName, doc.name!);
  await routeTo(route);
};

const handleMakeNewDoc = async () => {
  await makeNewDoc();
};

const applyFilter = (filtersVal: QueryFilter) => {
  list.value?.updateData(filtersVal);
};

const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value;
  if (!isSelectionMode.value) {
    showDropdown.value = false;
    selectedItems.value = [];
  }
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const createInvoice = async (value: string) => {
  if (
    value === ModelNameEnum.SalesQuote ||
    value === ModelNameEnum.SalesInvoice ||
    value === ModelNameEnum.PurchaseInvoice
  ) {
    const doc = fyo.doc.getNewDoc(value);

    for (const itemName of selectedItems.value) {
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
    selectedItems.value = [];
    isSelectionMode.value = false;
    showDropdown.value = false;
  }
};

const updateSelectedItems = (selected: string[]) => {
  selectedItems.value = selected;
};

const getListConfig = (schemaNameVal: string) => {
  const config = fyo.models[schemaNameVal]?.getListViewSettings?.(fyo);
  if (config?.columns === undefined) {
    return {
      columns: ['name'],
    };
  }
  return config;
};

// Lifecycles
onActivated(() => {
  listConfig.value = getListConfig(props.schemaName);
  store.docsPath = docsPathMap[props.schemaName] ?? docsPathMap.Entries ?? '';

  if (store.isDevelopment && typeof window !== 'undefined') {
    // @ts-expect-error
    window.lv = {
      listConfig,
      openExportModal,
      listFilters,
      isSelectionMode,
      showDropdown,
      selectedItems,
      context,
      title,
      fields,
      canCreate,
      actionOptions,
      openDoc,
      makeNewDoc,
      createInvoice,
    };
  }

  setShortcuts();
});

onDeactivated(() => {
  store.docsPath = '';
  shortcuts?.delete(context.value);
});
</script>
