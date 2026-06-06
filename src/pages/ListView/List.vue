<template>
  <view class="text-base flex flex-col overflow-hidden h-full">
    <!-- Main Scrollable Table Wrapper -->
    <ScrollArea v-if="data?.length" class="flex-1 w-full" orientation="both">
      <view
        :style="{
          minWidth: `${Math.max(800, columns.length * 160)}px`,
        }"
        class="flex flex-col min-h-full"
      >
        <!-- Title Row -->
        <view class="flex items-center sticky top-0 bg-canvas z-10">
          <view
            v-if="!isSelectionMode"
            class="w-8 text-end me-2 text-description"
          >
            #
          </view>
          <view v-else class="w-8 flex justify-end me-2">
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
          </view>
          <Row
            class="flex-1 text-description h-row-mid"
            :column-count="columns.length"
            gap="1rem"
          >
            <view
              v-for="(column, i) in columns"
              :key="column.label"
              class="overflow-x-auto no-scrollbar whitespace-nowrap h-row items-center flex"
              :class="{
                'ms-auto': isNumeric(column.fieldtype),
                'pe-4': i === columns.length - 1,
              }"
            >
              {{ column.label }}
            </view>
          </Row>
        </view>
        <view
          class="border-b border-border sticky top-[var(--h-row-mid)] z-10"
        />

        <!-- Data Rows -->
        <view class="flex-1">
          <view v-for="(row, i) in dataSlice" :key="row.name as string">
            <!-- Row Content -->
            <view class="flex hover:bg-surface-hover items-center">
              <view
                v-if="!isSelectionMode"
                class="w-8 text-end me-2 text-description"
              >
                {{ i + pageStart + 1 }}
              </view>
              <view v-else class="w-8 flex justify-end me-2">
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
              </view>

              <Row
                gap="1rem"
                class="cursor-pointer text-main flex-1 h-row-mid"
                :column-count="columns.length"
                @tap="
                  isSelectionMode ? null : emit('openDoc', String(row.name))
                "
              >
                <ListCell
                  v-for="(column, c) in columns"
                  :key="column.label"
                  :class="{
                    'text-end': isNumeric(column.fieldtype),
                    'pe-4': c === columns.length - 1,
                  }"
                  :row="row as RenderData"
                  :column="column"
                  @status-found="handleStatusFound"
                />
              </Row>
            </view>
            <view
              class="border-b border-border"
              v-if="!(i === dataSlice.length - 1 && i > 13)"
            />
          </view>
        </view>
      </view>
    </ScrollArea>

    <!-- Pagination Footer -->
    <view v-if="data?.length" class="mt-auto flex-shrink-0">
      <view class="border-b border-border" />
      <Paginator
        :item-count="data.length"
        class="px-4"
        @index-change="setPageIndices"
      />
    </view>

    <!-- Empty State -->
    <view
      v-if="!data?.length"
      class="flex flex-col items-center justify-center my-auto"
    >
      <img src="../../assets/img/list-empty-state.svg" alt="" class="w-24" />
      <text class="my-3 text-description">
        {{ t`No entries found` }}
      </text>
      <Button v-if="canCreate" type="primary" @tap="emit('makeNewDoc')">
        {{ t`Make Entry` }}
      </Button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, toRaw } from 'vue';
import { ListViewSettings, RenderData } from 'fyo/model/types';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Paginator from 'src/components/Paginator.vue';
import Row from 'src/components/Row.vue';
import { ScrollArea } from 'src/components/ui';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { isNumeric } from 'src/utils';
import { QueryFilter } from 'utils/db/types';
import ListCell from './ListCell.vue';

// Define Props
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

// Define Emits
const emit = defineEmits<{
  (e: 'openDoc', name: string): void;
  (e: 'makeNewDoc'): void;
  (e: 'updatedData', filters: any): void;
  (e: 'selected-items-changed', selectedItems: string[]): void;
}>();

// Reactive State
const data = ref<RenderData[]>([]);
const pageStart = ref(0);
const pageEnd = ref(0);
const statusMap = ref<Record<string, string>>({});
const selectedItems = ref<string[]>([]);

// Computed properties
const dataSlice = computed(() => {
  return data.value.slice(pageStart.value, pageEnd.value);
});

const isAllSelected = computed(() => {
  return (
    data.value.length > 0 && selectedItems.value.length === data.value.length
  );
});

const columns = computed(() => {
  let cols = props.listConfig?.columns ?? [];

  if (cols.length === 0) {
    cols = fyo.schemaMap[props.schemaName]?.quickEditFields ?? [];
    cols = [...new Set(['name', ...cols])];
  }

  return cols
    .map((fieldname) => {
      if (typeof fieldname === 'object') {
        return fieldname;
      }

      return fyo.getField(props.schemaName, fieldname as string);
    })
    .filter(Boolean);
});

// Methods
const handleStatusFound = ({
  rowId,
  status,
}: {
  rowId: string;
  status: string;
}) => {
  statusMap.value[rowId] = status;
};

const setPageIndices = ({ start, end }: { start: number; end: number }) => {
  pageStart.value = start;
  pageEnd.value = end;
};

const updateData = async (filterObj?: Record<string, unknown>) => {
  const baseFilters = JSON.parse(JSON.stringify(toRaw(props.filters)));
  const activeFilters = JSON.parse(
    JSON.stringify({ ...baseFilters, ...filterObj })
  );

  let statusFilter: [string, string] | undefined;

  if ('status' in activeFilters) {
    statusFilter = activeFilters['status'] as [string, string];
  }

  const isStatusFilter =
    Array.isArray(statusFilter) && statusFilter[0] === 'like';
  if (isStatusFilter) {
    delete activeFilters['status'];
  }

  const orderBy = ['created'];
  if (fyo.db.fieldMap[props.schemaName]['date']) {
    orderBy.unshift('date');
  }

  const tableData = await fyo.db.getAll(props.schemaName, {
    fields: ['*'],
    filters: activeFilters as QueryFilter,
    orderBy,
  });

  let filteredData = tableData;

  if (isStatusFilter && statusFilter?.[1]) {
    const lowercaseStatus = String(statusFilter[1]).toLowerCase();

    const matchedNames = Object.entries(statusMap.value)
      .filter(([, status]) => status.toLowerCase() === lowercaseStatus)
      .map(([rowId]) => rowId);

    filteredData = tableData.filter((row) =>
      matchedNames.includes(String(row.name))
    );
  }

  data.value = filteredData.map((d) => ({
    ...d,
    schema: fyo.schemaMap[props.schemaName],
  })) as RenderData[];
  emit('updatedData', activeFilters);
};

const setUpdateListeners = () => {
  if (!props.schemaName) {
    return;
  }

  const listener = async () => {
    await updateData();
  };

  if (fyo.schemaMap[props.schemaName]?.isSubmittable) {
    fyo.doc.observer.on(`submit:${props.schemaName}`, listener);
    fyo.doc.observer.on(`revert:${props.schemaName}`, listener);
  }

  fyo.doc.observer.on(`sync:${props.schemaName}`, listener);
  fyo.db.observer.on(`delete:${props.schemaName}`, listener);
  fyo.doc.observer.on(`rename:${props.schemaName}`, listener);
};

const toggleItemSelection = (itemName: string) => {
  const index = selectedItems.value.indexOf(itemName);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(itemName);
  }
  emit('selected-items-changed', selectedItems.value);
};

const toggleSelectAll = (checked: boolean) => {
  selectedItems.value = checked
    ? data.value.map((row) => row.name as string)
    : [];
  emit('selected-items-changed', selectedItems.value);
};

// Watchers
watch(
  () => props.schemaName,
  async (newValue, oldValue) => {
    if (oldValue === newValue) {
      return;
    }

    await updateData();
  }
);

onMounted(async () => {
  await updateData();
  setUpdateListeners();
});

// Expose updateData so parents can trigger updates
defineExpose({
  updateData,
});
</script>
