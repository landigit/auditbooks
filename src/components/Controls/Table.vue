<template>
  <div v-if="tableFields?.length">
    <div v-if="showLabel" class="text-description text-sm mb-1">
      {{ df.label }}
    </div>

    <div :class="border ? 'border border-border rounded-md' : ''">
      <!-- Title Row -->
      <Row
        :ratio="ratio"
        class="border-b border-border px-2 text-description w-full flex items-center"
      >
        <div class="flex items-center ps-2">#</div>
        <div
          v-for="df in tableFields"
          :key="df.fieldname"
          class="flex px-2 h-row-mid"
          :class="[
            df.sub_label
              ? 'flex-col items-center text-center'
              : isNumeric(df)
                ? 'ms-auto items-center'
                : 'items-center',
          ]"
        >
          <span>{{ df.label }}</span>
          <p v-if="df.sub_label" class="text-xs">
            {{ df.sub_label }}
          </p>
        </div>
      </Row>

      <!-- Data Rows -->
      <div
        v-if="value"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
        :style="{ 'max-height': maxHeight }"
      >
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
            (field: any, value: any) => $emit('row-change', field, value, df)
          "
        />
      </div>

      <!-- Add Row and Row Count -->
      <Row
        v-if="!isReadOnly"
        :ratio="ratio"
        class="text-description cursor-pointer px-2 w-full h-row-mid flex items-center focus:outline-none focus:ring-1 focus:ring-main"
        :class="value.length > 0 ? 'border-t border-border' : ''"
        tabindex="0"
        @click="addRow"
        @keydown.enter="addRow"
      >
        <div class="flex items-center ps-1">
          <lucide-icon name="plus" class="w-4 h-4 text-description" />
        </div>
        <div
          class="flex justify-between px-2"
          :style="`grid-column: 2 / ${ratio.length + 1}`"
        >
          <p>
            {{ t`Add Row` }}
          </p>
          <p
            v-if="
              value &&
              maxRowsBeforeOverflow &&
              value.length > maxRowsBeforeOverflow
            "
            class="text-end px-2"
          >
            {{ t`${value.length} rows` }}
          </p>
        </div>
      </Row>
    </div>
  </div>
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
  maxRowsBeforeOverflow: 3,
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

const ratio = computed(() => {
  const baseRatio = [0.3].concat(tableFields.value.map(() => 1));
  if (canEditRow.value) {
    return baseRatio.concat(0.3);
  }
  return baseRatio;
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

const setMaxHeight = () => {
  if (props.maxRowsBeforeOverflow === 0) {
    maxHeight.value = '';
    return;
  }

  const size = props.value?.length ?? 0;
  if (size === 0) {
    maxHeight.value = '';
    return;
  }

  const rows = tableRowRefs.value;
  const rowHeight = rows?.[0]?.$el?.offsetHeight;
  if (rowHeight === undefined) {
    maxHeight.value = '';
    return;
  }

  const computedMaxHeight =
    rowHeight * Math.min(props.maxRowsBeforeOverflow, size);
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
