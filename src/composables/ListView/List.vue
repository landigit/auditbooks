<template>
  <div class="text-base flex flex-col overflow-hidden h-full">
    <!-- Outer Vertical Scroll Container (Sticking to right wall) -->
    <div v-if="data?.length" class="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
      <!-- Inner Horizontal Scroll Container -->
      <div class="overflow-x-auto min-w-0 flex-1 flex flex-col">
        <!-- Title Row -->
        <div
          class="flex items-center list-header-row px-4"
          :style="{
            paddingRight: dataSlice.length > 13 ? 'calc(var(--w-scrollbar) + 1rem)' : '',
          }"
        >
          <div
            v-if="!isSelectionMode"
            class="w-8 text-start me-2 text-gray-700 dark:text-gray-400"
          >
            #
          </div>
          <div v-else class="w-8 flex justify-end me-2">
            <Check
              :df="{
                fieldtype: 'Check',
                fieldname: 'selectAll',
                label: '',
              }"
              :show-label="false"
              :value="isAllSelected"
              @change="toggleSelectAll"
            />
          </div>
          <Row
            class="text-gray-700 dark:text-gray-400 h-row-mid"
            :grid-template-columns="gridTemplateColumns"
            gap="0.5rem"
          >
            <div
              v-for="(column, i) in columns"
              :key="column.label"
              class="overflow-x-auto no-scrollbar whitespace-nowrap h-row items-center flex"
              :class="{
                'ms-auto': isColumnNumeric(column),
                'pe-4': i === columns.length - 1,
              }"
            >
              {{ column.label }}
            </div>
          </Row>
        </div>
        <hr class="dark:border-gray-800" />

        <!-- Data Rows (No individual vertical scrollbar here) -->
        <div v-if="dataSlice.length !== 0">
          <div v-for="(row, i) in dataSlice" :key="(row.name as string)">
            <!-- Row Content -->
            <div class="flex hover:bg-gray-50 dark:hover:bg-gray-850 items-center px-4">
              <div
                v-if="!isSelectionMode"
                class="w-8 text-start me-2 text-gray-700 dark:text-gray-400"
              >
                {{ i + pageStart + 1 }}
              </div>
              <div v-else class="w-8 flex justify-end me-2">
                <Check
                  :df="{
                    fieldtype: 'Check',
                    fieldname: 'selectItem',
                    label: '',
                  }"
                  :show-label="false"
                  :value="selectedItems.includes(row.name as string)"
                  @change="toggleItemSelection(row.name as string)"
                />
              </div>

              <Row
                gap="0.5rem"
                class="cursor-pointer text-gray-900 dark:text-gray-300 h-row-mid"
                :grid-template-columns="gridTemplateColumns"
                @click="isSelectionMode ? null : $emit('openDoc', row.name)"
              >
                <ListCell
                  v-for="(column, c) in columns"
                  :key="column.label"
                  :class="{
                    'text-end': isColumnNumeric(column),
                    'pe-4': c === columns.length - 1,
                  }"
                  :row="(row as RenderData)"
                  :column="column"
                  @status-found="handleStatusFound"
                />
              </Row>
            </div>
            <hr
              v-if="!(i === dataSlice.length - 1 && i > 13)"
              class="dark:border-gray-800"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Footer -->
    <div v-if="data?.length" class="mt-auto">
      <hr class="dark:border-gray-800" />
      <div v-if="isMobile" class="flex justify-center p-3">
        <Button
          v-if="pageEnd < data.length"
          type="primary"
          @click="loadMore"
        >
          {{ t`Load More` }}
        </Button>
      </div>
      <Paginator
        v-else
        :item-count="data.length"
        class="px-4"
        :hide-count-selector="schemaName === 'Tax'"
        :style="schemaName === 'Tax' ? { width: '100%' } : { width: tableWidth, maxWidth: '100%' }"
        @index-change="setPageIndices"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="flex-1 flex flex-col items-center justify-center"
    >
      <img src="../../assets/img/list-empty-state.svg" alt="" class="w-24" />
      <p class="my-3 text-gray-800 dark:text-gray-200">
        {{ t`No entries found` }}
      </p>
      <Button v-if="canCreate" type="primary" @click="$emit('makeNewDoc')">
        {{ t`Make Entry` }}
      </Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, toRaw } from 'vue';
import { ListViewSettings, RenderData } from 'fyo/model/types';
import { cloneDeep } from 'lodash';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Paginator from 'src/components/Paginator.vue';
import Row from 'src/components/Row.vue';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';
import { QueryFilter } from 'utils/db/types';
import ListCell from './ListCell.vue';
import { useBreakpoint } from 'src/composables/useBreakpoint.js';
import { useApp } from 'src/composables/useApp.js';

const props = withDefaults(
  defineProps<{
    listConfig?: ListViewSettings;
    filters?: QueryFilter;
    schemaName: string;
    canCreate?: boolean;
    isSelectionMode?: boolean;
  }>(),
  {
    listConfig: () => ({ columns: [] }),
    filters: () => ({}),
    canCreate: false,
    isSelectionMode: false,
  }
);

const emit = defineEmits<{
  (e: 'openDoc', name: any): void;
  (e: 'makeNewDoc'): void;
  (e: 'updatedData', filters: any): void;
  (e: 'selected-items-changed', selected: string[]): void;
}>();

const { t } = useApp();
const { isMobile } = useBreakpoint();

const data = ref<RenderData[]>([]);
const pageStart = ref(0);
const pageEnd = ref(20);
const statusMap = ref<Record<string, string>>({});
const selectedItems = ref<string[]>([]);

const dataSlice = computed(() => {
  return data.value.slice(pageStart.value, pageEnd.value);
});

const isAllSelected = computed(() => {
  return data.value.length > 0 && selectedItems.value.length === data.value.length;
});

const columns = computed(() => {
  let cols = props.listConfig?.columns ?? [];

  if (cols.length === 0) {
    cols = fyo.schemaMap[props.schemaName]?.quickEditFields ?? [];
    cols = [...new Set(['name', ...cols])];
  }

  const rawCols = cols
    .map((fieldname) => {
      if (typeof fieldname === 'object') {
        return fieldname;
      }
      return fyo.getField(props.schemaName, fieldname);
    })
    .filter(Boolean);

  if (isMobile.value) {
    return rawCols.slice(0, 3);
  }
  return rawCols;
});

const gridTemplateColumns = computed(() => {
  return columns.value
    .map((col) => {
      const fieldname = col.fieldname?.toLowerCase() ?? '';
      const fieldtype = col.fieldtype;

      if (fieldname === 'name') {
        return '10rem';
      }
      if (fieldname === 'status') {
        return '6rem';
      }
      if (fieldname.includes('customer') || fieldname.includes('supplier') || fieldname.includes('party')) {
        return '11rem';
      }
      if (fieldtype === 'Check') {
        return '3rem';
      }
      if (isNumeric(fieldtype)) {
        return '8rem';
      }
      if (fieldtype === 'Date' || fieldtype === 'Datetime') {
        return '10rem';
      }
      return '10rem';
    })
    .join(' ');
});

const tableWidth = computed(() => {
  let totalRem = 2.5; // w-8 (2rem) + me-2 (0.5rem)
  columns.value.forEach((col) => {
    const fieldname = col.fieldname?.toLowerCase() ?? '';
    const fieldtype = col.fieldtype;

    if (fieldname === 'name') {
      totalRem += 10;
    } else if (fieldname === 'status') {
      totalRem += 6;
    } else if (fieldname.includes('customer') || fieldname.includes('supplier') || fieldname.includes('party')) {
      totalRem += 11;
    } else if (fieldtype === 'Check') {
      totalRem += 3;
    } else if (isNumeric(fieldtype)) {
      totalRem += 8;
    } else if (fieldtype === 'Date' || fieldtype === 'Datetime') {
      totalRem += 10;
    } else {
      totalRem += 10;
    }
  });
  totalRem += (columns.value.length - 1) * 0.5; // gap="0.5rem"
  return `${totalRem}rem`;
});

function isColumnNumeric(col: any) {
  if (!col) return false;
  const fieldname = col.fieldname?.toLowerCase() ?? '';
  const fieldtype = col.fieldtype;
  return isNumeric(fieldtype) ||
    fieldname.includes('amount') ||
    fieldname.includes('total') ||
    fieldname.includes('credit') ||
    fieldname.includes('debit') ||
    fieldname.includes('rate');
}

function handleStatusFound({ rowId, status }: { rowId: string; status: string }) {
  statusMap.value[rowId] = status;
}

function setPageIndices({ start, end }: { start: number; end: number }) {
  pageStart.value = start;
  pageEnd.value = end;
}

function loadMore() {
  pageEnd.value = Math.min(pageEnd.value + 20, data.value.length);
}

// Track active listeners for cleanup
let activeListeners: { event: string; listener: (...args: any[]) => void; isDb?: boolean }[] = [];

function clearListeners() {
  activeListeners.forEach(({ event, listener, isDb }) => {
    const observer = isDb ? fyo.db.observer : fyo.doc.observer;
    observer.off(event, listener);
  });
  activeListeners = [];
}

function setUpdateListeners() {
  clearListeners();

  if (!props.schemaName) {
    return;
  }

  const listener = async () => {
    await updateData();
  };

  const schemaName = props.schemaName;

  if (fyo.schemaMap[schemaName]?.isSubmittable) {
    fyo.doc.observer.on(`submit:${schemaName}`, listener);
    activeListeners.push({ event: `submit:${schemaName}`, listener });

    fyo.doc.observer.on(`revert:${schemaName}`, listener);
    activeListeners.push({ event: `revert:${schemaName}`, listener });
  }

  fyo.doc.observer.on(`sync:${schemaName}`, listener);
  activeListeners.push({ event: `sync:${schemaName}`, listener });

  fyo.db.observer.on(`delete:${schemaName}`, listener);
  activeListeners.push({ event: `delete:${schemaName}`, listener, isDb: true });

  fyo.doc.observer.on(`rename:${schemaName}`, listener);
  activeListeners.push({ event: `rename:${schemaName}`, listener });
}

async function updateData(filters?: Record<string, unknown>) {
  const baseFilters = cloneDeep(toRaw(props.filters));
  filters = cloneDeep({ ...baseFilters, ...filters });

  let statusFilter: [string, string] | undefined;

  if ('status' in filters) {
    statusFilter = filters['status'] as [string, string];
  }

  const isStatusFilter =
    Array.isArray(statusFilter) && statusFilter[0] === 'like';
  if (isStatusFilter) {
    delete filters['status'];
  }

  const orderBy = ['created'];
  if (fyo.db.fieldMap[props.schemaName]['date']) {
    orderBy.unshift('date');
  }

  const tableData = await fyo.db.getAll(props.schemaName, {
    fields: ['*'],
    filters: filters as QueryFilter,
    orderBy,
  });

  let filteredData = tableData;

  if (isStatusFilter && statusFilter?.[1]) {
    const lowercaseStatus = String(statusFilter[1]).toLowerCase();

    const matchedNames = Object.entries(statusMap.value)
      .filter((entry) => entry[1].toLowerCase() === lowercaseStatus)
      .map((entry) => entry[0]);

    filteredData = tableData.filter((row) =>
      matchedNames.includes(String(row.name))
    );
  }

  data.value = filteredData.map((d) => ({
    ...d,
    schema: fyo.schemaMap[props.schemaName],
  })) as RenderData[];

  if (isMobile.value) {
    pageStart.value = 0;
    pageEnd.value = Math.min(20, data.value.length);
  }

  emit('updatedData', filters);
}

function toggleItemSelection(itemName: string) {
  const index = selectedItems.value.indexOf(itemName);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(itemName);
  }
  emit('selected-items-changed', selectedItems.value);
}

function toggleSelectAll(checked: boolean) {
  selectedItems.value = checked
    ? data.value.map((row) => row.name as string)
    : [];
  emit('selected-items-changed', selectedItems.value);
}

watch(
  () => props.schemaName,
  async (newSchema, oldSchema) => {
    if (newSchema === oldSchema) {
      return;
    }
    selectedItems.value = [];
    await updateData();
    setUpdateListeners();
  }
);

onMounted(async () => {
  await updateData();
  setUpdateListeners();
});

onUnmounted(() => {
  clearListeners();
});

defineExpose({
  updateData,
  data,
});
</script>

