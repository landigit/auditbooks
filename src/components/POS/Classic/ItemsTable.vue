<template>
  <Row
    :ratio="ratio"
    class="border border-border items-center mt-4 px-2 rounded-t-md text-description w-full"
  >
    <div
      v-for="df in tableFields"
      :key="df.fieldname"
      class="flex items-center px-2 py-2 text-lg"
      :class="{
        'ms-auto': isNumeric(df as Field),
      }"
      :style="{
        height: ``,
      }"
    >
      {{ df.label }}
    </div>
  </Row>

  <div
    class="overflow-y-auto custom-scroll custom-scroll-thumb2"
    style="height: 70vh"
  >
    <Row
      v-if="items"
      v-for="row in items as POSItem[]"
      :ratio="ratio"
      :border="true"
      class="border-b border-l border-r border-border group h-row-mid hover:bg-surface-hover bg-surface items-center justify-center px-2 w-full"
      @click="handleChange(row)"
    >
      <FormControl
        v-for="df in tableFields"
        :key="df.fieldname"
        size="large"
        class=""
        :df="df"
        :value="(row as POSItem)[df.fieldname as keyof POSItem]"
        :readOnly="true"
      />
    </Row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Row from 'src/components/Row.vue';
import { isNumeric } from 'src/utils/api';
import { Field } from 'schemas/types';
import { POSItem } from '../types';

const props = defineProps({
  items: Array,
  itemQtyMap: Object,
  itemVisibility: {
    type: String,
    default: 'Inventory Items',
  },
});

const emit = defineEmits(['addItem', 'updateValues']);

const ratio = computed(() => {
  if (props.itemVisibility === 'ERP Sync Items') {
    return [1, 1.5, 0.8];
  }
  return [1, 1, 1, 0.7];
});

const tableFields = computed(() => {
  const fields = [
    {
      fieldname: 'name',
      fieldtype: 'Data',
      label: 'Item',
      placeholder: 'Item',
      readOnly: true,
    },
    {
      fieldname: 'rate',
      label: 'Rate',
      placeholder: 'Rate',
      fieldtype: 'Currency',
      readOnly: true,
    },
    {
      fieldname: 'unit',
      label: 'Unit',
      placeholder: 'Unit',
      fieldtype: 'Data',
      target: 'UOM',
      readOnly: true,
    },
  ] as Field[];

  if (props.itemVisibility !== 'ERP Sync Items') {
    fields.splice(2, 0, {
      fieldname: 'availableQty',
      label: 'Qty',
      placeholder: 'Available Qty',
      fieldtype: 'Float',
      readOnly: true,
    });
  }

  return fields;
});

function handleChange(value: POSItem) {
  emit('addItem', value);
  emit('updateValues');
}
</script>
