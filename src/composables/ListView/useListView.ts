import { ref, computed, onActivated, onDeactivated } from 'vue';
import { fyo } from 'src/initFyo';
import { docsPathMap, getCreateFiltersFromListViewFilters } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import { useShortcuts } from 'src/composables/useShortcuts';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import type { Field } from 'schemas/types';

export function useListView(props: { schemaName: string; filters?: Record<string, any>; pageTitle?: string }) {
  const shortcuts = useShortcuts();

  const listConfig = ref<any>(undefined);
  const openExportModal = ref(false);
  const listFilters = ref<QueryFilter>({});
  const isSelectionMode = ref(false);
  const showDropdown = ref(false);
  const selectedItems = ref<string[]>([]);

  // Template refs
  const listRef = ref<any>(null);
  const makeNewDocButtonRef = ref<any>(null);
  const exportButtonRef = ref<any>(null);
  const filterDropdownRef = ref<any>(null);

  const context = computed(() => 'ListView-' + props.schemaName);

  const title = computed(() => {
    if (props.pageTitle) {
      return props.pageTitle;
    }
    return fyo.schemaMap[props.schemaName]?.label ?? props.schemaName;
  });

  const fields = computed<Field[]>(() => {
    return fyo.schemaMap[props.schemaName]?.fields ?? [];
  });

  const canCreate = computed(() => {
    return fyo.schemaMap[props.schemaName]?.create !== false;
  });

  const actionOptions = [
    { value: 'SalesQuote', label: 'Sales Quote' },
    { value: 'SalesInvoice', label: 'Sales Invoice' },
    { value: 'PurchaseInvoice', label: 'Purchase Invoice' },
  ];

  function getListConfig(schemaName: string) {
    const config = fyo.models[schemaName]?.getListViewSettings?.(fyo);
    if (config?.columns === undefined) {
      return {
        columns: ['name'],
      };
    }
    return config;
  }

  function setShortcuts() {
    if (!shortcuts) {
      return;
    }
    shortcuts.pmod.set(context.value, ['KeyN'], () =>
      makeNewDocButtonRef.value?.$el?.click()
    );
    shortcuts.pmod.set(context.value, ['KeyE'], () =>
      exportButtonRef.value?.$el?.click()
    );
  }

  onActivated(() => {
    listConfig.value = getListConfig(props.schemaName);
    docsPathRef.value =
      docsPathMap[props.schemaName] ?? docsPathMap.Entries ?? '';

    // @ts-ignore
    window.lv = {
      listConfig: listConfig.value,
      openExportModal: openExportModal.value,
      listFilters: listFilters.value,
      isSelectionMode: isSelectionMode.value,
      selectedItems: selectedItems.value,
      filterDropdownRef,
      listRef,
    };

    setShortcuts();
  });

  onDeactivated(() => {
    docsPathRef.value = '';
    shortcuts?.delete(context.value);
  });

  function updatedData(newFilters: QueryFilter) {
    listFilters.value = newFilters;
  }

  async function openDoc(name: string) {
    const route = getFormRoute(props.schemaName, name);
    await routeTo(route);
  }

  async function makeNewDoc() {
    if (!canCreate.value) {
      return;
    }

    const docFilters = getCreateFiltersFromListViewFilters(props.filters ?? {});
    const doc = fyo.doc.getNewDoc(props.schemaName, docFilters);
    const route = getFormRoute(props.schemaName, doc.name!);
    await routeTo(route);
  }

  async function handleMakeNewDoc() {
    await makeNewDoc();
  }

  function applyFilter(newFilters: QueryFilter) {
    listRef.value?.updateData(newFilters);
  }

  function toggleSelectionMode() {
    isSelectionMode.value = !isSelectionMode.value;
    if (!isSelectionMode.value) {
      showDropdown.value = false;
      selectedItems.value = [];
    }
  }

  function toggleDropdown() {
    showDropdown.value = !showDropdown.value;
  }

  async function createInvoice(value: string) {
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
  }

  function updateSelectedItems(selected: string[]) {
    selectedItems.value = selected;
  }

  return {
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
  };
}
