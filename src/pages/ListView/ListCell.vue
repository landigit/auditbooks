<template>
  <div class="flex items-center truncate" :class="cellClass">
    <span v-if="!customRenderer" class="truncate">{{ columnValue }}</span>
    <component :is="customRenderer as {}" v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ColumnConfig, RenderData } from 'fyo/model/types';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';

type Column = ColumnConfig | Field;

// Helper to assert whether the column is a standard field
function isField(column: ColumnConfig | Field): column is Field {
  if ((column as ColumnConfig).display || (column as ColumnConfig).render) {
    return false;
  }
  return true;
}

// Define Props
const props = defineProps<{
  row: RenderData;
  column: Column;
}>();

// Define Emits
const emit = defineEmits<{
  (
    e: 'status-found',
    payload: {
      rowId: string;
      fieldname: string;
      status: string;
      label: string;
    }
  ): void;
}>();

// Computed Properties
const columnValue = computed<string>(() => {
  const column = props.column;
  const value = props.row[props.column.fieldname];

  if (isField(column)) {
    return fyo.format(value, column);
  }

  return column.display?.(value, fyo) ?? '';
});

const customRenderer = computed(() => {
  const { render } = props.column as ColumnConfig;

  if (!render) {
    return;
  }

  return render(props.row);
});

const cellClass = computed(() => {
  return isNumeric(props.column.fieldtype) ? 'justify-end' : '';
});

// Mounted lifecycle
onMounted(() => {
  const { render } = props.column as ColumnConfig;
  if (render) {
    const result = render(props.row) as {
      template: string;
      metadata?: { status: string; color: string; label: string };
    };

    if (result?.metadata) {
      emit('status-found', {
        rowId: String(props.row.name || props.row.id),
        fieldname: props.column.fieldname,
        status: result.metadata.status,
        label: result.metadata.label,
      });
    }
  }
});
</script>
