<template>
  <view v-if="tableFields?.length">
    <view v-if="showLabel" class="text-description text-sm mb-1">
      {{ df.label }}
    </view>

    <view class="overflow-x-auto w-full custom-scroll custom-scroll-thumb1">
      <view
        class="w-full"
        :style="{ minWidth: minTableWidth }"
        :class="border ? 'border border-border rounded-md' : ''"
      >
        <!-- Scrollable container for both Title and Data Rows -->
        <view
          class="overflow-auto custom-scroll custom-scroll-thumb1"
          :style="{
            'max-height': maxHeight
              ? `calc(${maxHeight} + var(--h-row-mid))`
              : '',
            'scrollbar-gutter': 'stable',
          }"
        >
          <!-- Title Row -->
          <Row
            :ratio="ratio"
            class="sticky top-0 bg-surface z-10 border-b border-border px-2 text-description w-full items-center"
          >
            <view class="flex items-center ps-2">#</view>
            <view
              v-for="df in tableFields"
              :key="df.fieldname"
              class="flex h-row-mid w-full"
              :class="[
                headerCellClass,
                df.sub_label
                  ? 'flex-col items-center text-center'
                  : isNumeric(df)
                    ? 'justify-end items-center'
                    : 'items-center',
              ]"
            >
              <text>{{ df.label }}</text>
              <text v-if="df.sub_label" class="text-xs">
                {{ df.sub_label }}
              </text>
            </view>
            <view v-if="canEditRow" class="flex h-row-mid w-full" />
          </Row>

          <!-- Data Rows -->
          <view v-if="value?.length">
            <TableRow
              v-for="(row, idx) of value"
              ref="tableRowRefs"
              :key="row.name"
              :class="idx < value.length - 1 ? 'border-b border-border' : ''"
              v-bind="{ row, tableFields, size, ratio, isNumeric }"
              :read-only="isReadOnly"
              :can-edit-row="canEditRow"
              @remove="removeRow(row)"
              @change="
                (field: any, value: any) =>
                  $emit('row-change', field, value, df)
              "
            />
          </view>
        </view>

        <!-- Add Row and Row Count -->
        <Row
          v-if="!isReadOnly"
          :ratio="ratio"
          class="text-description cursor-pointer px-2 w-full h-row-mid items-center focus:outline-none focus:ring-1 focus:ring-main"
          :class="value.length > 0 ? 'border-t border-border' : ''"
          tabindex="0"
          @tap="addRow"
          @keydown.enter="addRow"
        >
          <view class="flex items-center ps-1">
            <lucide-icon name="plus" class="w-4 h-4 text-description" />
          </view>
          <view
            class="flex justify-between px-2"
            :style="`grid-column: 2 / ${ratio.length + 1}`"
          >
            <text>
              {{ t`Add Row` }}
            </text>
            <text
              v-if="
                value && effectiveMaxRows && value.length > effectiveMaxRows
              "
              class="text-end px-2"
            >
              {{ t`${value.length} rows` }}
            </text>
          </view>
        </Row>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import { useAppStore } from 'src/stores/app';
import Row from 'src/components/Row.vue';
import TableRow from './TableRow.vue';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';

interface TableProps extends BaseControlProps {
  value?: any[];
  showHeader?: boolean;
  maxRowsBeforeOverflow?: number;
  border?: boolean;
}

const props = withDefaults(defineProps<TableProps>(), {
  value: () => [],
  showHeader: true,
  border: false,
  step: 1,
  size: 'large',
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
});

const emit = defineEmits<{
  (e: 'focus', ev: FocusEvent): void;
  (e: 'change', val: any): void;
  (e: 'editrow', ...args: any[]): void;
  (e: 'row-change', field: any, value: any, df: any): void;
}>();

const maxHeight = ref('');
const store = useAppStore();
const inputRef = ref<HTMLElement | null>(null);
const tableRowRefs = ref<any[]>([]);

const { doc, isReadOnly, isNumeric, triggerChange } = useBaseControl(
  props,
  emit,
  inputRef
);

const canEditRow = computed(() => {
  return (props.df as any).edit;
});

const effectiveMaxRows = computed(() => {
  if (props.maxRowsBeforeOverflow !== undefined) {
    return props.maxRowsBeforeOverflow;
  }
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    return 5; // Show up to 5 rows on desktop by default
  }
  return 3; // Show up to 3 rows on mobile by default
});

const minTableWidth = computed(() => {
  const sum = ratio.value.reduce((acc, val) => acc + val, 0);
  const computedWidth = Math.round(sum * 110);
  return `${computedWidth}px`;
});

const ratio = computed(() => {
  const fieldsRatio = tableFields.value.map((df: any) => {
    if (!df) return 1.0;
    const type = df.fieldtype;
    const name = df.fieldname?.toLowerCase();

    if (name === 'item' || name === 'description' || name === 'account') {
      return 2.2;
    }
    if (
      type === 'Link' ||
      type === 'Data' ||
      type === 'Select' ||
      type === 'Text'
    ) {
      return 1.5;
    }
    if (
      type === 'Int' ||
      type === 'Float' ||
      type === 'Percent' ||
      type === 'Check'
    ) {
      return 0.7;
    }
    if (type === 'Date') {
      return 0.9;
    }
    return 1.0;
  });

  const baseRatio = [0.3].concat(fieldsRatio);
  if (canEditRow.value) {
    return baseRatio.concat(0.3);
  }
  return baseRatio;
});

const headerCellClass = computed(() => {
  return props.size === 'small' ? 'px-2' : 'px-3';
});

const tableFields = computed(() => {
  const target = (props.df as any).target;
  const fields = fyo.schemaMap[target]?.tableFields ?? [];
  return fields.map((fieldname: string) => fyo.getField(target, fieldname));
});

watch(
  () => props.value,
  () => {
    setMaxHeight();
  },
  { deep: true }
);

onMounted(() => {
  if (store.isDevelopment) {
    (window as any).tab = {
      value: props.value,
      df: props.df,
      doc: doc.value,
      tableFields: tableFields.value,
    };
  }
  setMaxHeight();
});

const focus = () => {};

const addRow = async () => {
  if (!doc.value) return;
  await doc.value.append((props.df as any).fieldname);
  await nextTick();
  scrollToRow(props.value.length - 1);
  triggerChange(props.value);

  nextTick(() => {
    const rows = tableRowRefs.value;
    if (rows && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      if (lastRow?.focusFirstInput) {
        lastRow.focusFirstInput();
      }
    }
  });
};

const removeRow = (row: any) => {
  if (!doc.value) return;
  doc.value.remove((props.df as any).fieldname, row.idx).then((s) => {
    if (!s) return;
    triggerChange(props.value);
  });
};

const scrollToRow = (index: number) => {
  const row = tableRowRefs.value[index];
  if (row && row.$el) {
    row.$el.scrollIntoView({ block: 'nearest' });
  }
};

const setMaxHeight = async () => {
  if (effectiveMaxRows.value === 0) {
    maxHeight.value = '';
    return;
  }

  const size = props.value?.length ?? 0;
  if (size === 0) {
    maxHeight.value = '';
    return;
  }

  await nextTick();

  const rows = tableRowRefs.value;
  let rowHeight = rows?.[0]?.$el?.offsetHeight;
  if (rowHeight === undefined || rowHeight === 0) {
    rowHeight = 48; // Fallback to standard row height (3rem)
  }

  const computedMaxHeight = rowHeight * Math.min(effectiveMaxRows.value, size);
  maxHeight.value = `${computedMaxHeight}px`;
};

defineExpose({
  maxHeight,
  ratio,
  tableFields,
  canEditRow,
  focus,
  addRow,
  removeRow,
  scrollToRow,
  setMaxHeight,
  isReadOnly,
});
</script>
