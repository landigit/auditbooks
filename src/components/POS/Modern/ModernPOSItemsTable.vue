<template>
  <div class="flex gap-2">
    <div
      class="w-1/2 overflow-y-auto custom-scroll custom-scroll-thumb2"
      style="height: 81vh"
    >
      <Row
        :ratio="ratio"
        class="mt-2 px-2 w-full flex items-center border rounded-t-md text-description border-border"
      >
        <div
          v-for="df in tableFields"
          :key="df.fieldname"
          class="flex items-center p-2 text-lg"
          :class="{
            'ms-auto': isNumeric(df as Field),
          }"
        >
          {{ df.label }}
        </div>
      </Row>

      <Row
        v-for="row in firstColumnItems as POSItem[]"
        :key="row.name"
        :ratio="ratio"
        :border="true"
        class="px-2 w-full border flex items-center justify-center group h-row-mid hover:bg-surface-hover bg-surface border-border"
        @click="handleChange(row)"
      >
        <FormControl
          v-for="df in tableFields"
          :key="df.fieldname"
          size="large"
          :df="df"
          :value="(row as POSItem)[df.fieldname as keyof POSItem]"
          :readOnly="true"
        />
      </Row>
    </div>

    <div
      class="w-1/2 overflow-y-auto custom-scroll custom-scroll-thumb2"
      style="height: calc(80vh - 20rem)"
    >
      <Row
        :ratio="ratio"
        class="mt-2 px-2 w-full flex items-center border rounded-t-md text-description border-border"
      >
        <div
          v-for="df in tableFields"
          :key="df.fieldname"
          class="flex items-center p-2 text-lg"
          :class="{
            'ms-auto': isNumeric(df as Field),
          }"
        >
          {{ df.label }}
        </div>
      </Row>
      <Row
        v-for="row in secondColumnItems as POSItem[]"
        :key="row.name"
        :ratio="ratio"
        :border="true"
        class="px-2 w-full border flex items-center justify-center group h-row-mid hover:bg-surface-hover bg-surface border-border"
        @click="handleChange(row)"
      >
        <FormControl
          v-for="df in tableFields"
          :key="df.fieldname"
          size="large"
          :df="df"
          :value="(row as POSItem)[df.fieldname as keyof POSItem]"
          :readOnly="true"
        />
      </Row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Row from 'src/components/Row.vue';
import { isNumeric } from 'src/utils';
import { t } from 'fyo';
import { Field } from 'schemas/types';
import { POSItem } from '../types';

const props = defineProps({
  items: {
    type: Array as () => POSItem[],
    default: () => [],
  },
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
      label: t`Item`,
      placeholder: 'Item',
      readOnly: true,
    },
    {
      fieldname: 'rate',
      label: t`Rate`,
      placeholder: 'Rate',
      fieldtype: 'Currency',
      readOnly: true,
    },
    {
      fieldname: 'unit',
      label: t`Unit`,
      placeholder: 'Unit',
      fieldtype: 'Data',
      target: 'UOM',
      readOnly: true,
    },
  ] as Field[];

  if (props.itemVisibility !== 'ERP Sync Items') {
    fields.splice(2, 0, {
      fieldname: 'availableQty',
      label: t`Qty`,
      placeholder: 'Available Qty',
      fieldtype: 'Float',
      readOnly: true,
    });
  }

  return fields;
});

const firstColumnItems = computed(() => {
  return props.items?.slice(0, Math.ceil(props.items.length / 2)) || [];
});

const secondColumnItems = computed(() => {
  return props.items?.slice(Math.ceil(props.items.length / 2)) || [];
});

function handleChange(value: POSItem) {
  emit('addItem', value);
  emit('updateValues');
}
</script>
