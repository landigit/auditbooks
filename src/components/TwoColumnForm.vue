<template>
  <div class="text-sm">
    <template v-for="df in formFields">
      <!-- Table Field Form (Eg: PaymentFor) -->
      <Table
        v-if="df.fieldtype === 'Table'"
        :key="`${df.fieldname}-table`"
        ref="controls"
        size="small"
        :df="df"
        :value="(doc[df.fieldname] ?? []) as unknown[]"
        @change="async (value) => await onChange(df, value)"
      />

      <!-- Regular Field Form -->
      <div
        v-else
        :key="`${df.fieldname}-regular`"
        class="grid items-center border-b border-border"
        :style="{
          ...style,
          height: getFieldHeight(df),
        }"
      >
        <div class="ps-4 flex text-description">
          {{ df.label }}
        </div>

        <div
          class="py-2 pe-4"
          :class="{
            'ps-2': df.fieldtype === 'AttachImage',
          }"
        >
          <FormControl
            ref="controls"
            size="small"
            :df="df"
            :value="doc[df.fieldname]"
            :class="{ 'p-2': df.fieldtype === 'Check' }"
            :text-end="false"
            @change="async (value) => await onChange(df, value)"
          />
          <div v-if="errors[df.fieldname]" class="text-sm text-error mt-2 ps-2">
            {{ errors[df.fieldname] }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, watch, onMounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import FormControl from 'src/components/Controls/FormControl.vue';
import { getErrorMessage } from 'src/utils/api/index.js';
import { evaluateHidden } from 'src/utils/api/doc.js';
import Table from './Controls/Table.vue';
import { Field } from 'schemas/types';
import { DocValue } from 'fyo/core/types';
import { useAppStore } from 'src/stores/app';

// --- Props & Emits ---
const props = withDefaults(
  defineProps<{
    doc: Doc;
    fields?: Field[];
    columnRatio?: number[];
  }>(),
  {
    fields: () => [],
    columnRatio: () => [1, 1],
  }
);

// --- State ---
const formFields = ref<Field[]>([]);
const errors = ref<Record<string, string>>({});
const store = useAppStore();
const controls = ref<any[]>([]);

// --- Computed ---
const style = computed(() => {
  let templateColumns = (props.columnRatio || [1, 1])
    .map((r) => `minmax(0, ${r}fr)`)
    .join(' ');
  return {
    'grid-template-columns': templateColumns,
  };
});

// --- Watchers ---
watch(
  () => props.doc,
  () => {
    setFormFields();
  }
);

// --- Expose ---
defineExpose({ onChange });

// --- Lifecycle ---
onMounted(() => {
  setFormFields();
  if (store.isDevelopment) {
    // @ts-expect-error
    window.tcf = { formFields, errors, props };
  }
});

// --- Methods ---
function getFieldHeight(field: Field) {
  if (['AttachImage', 'Text'].includes(field.fieldtype)) {
    return 'calc((var(--h-row-mid) + 1px) * 2)';
  }

  if (errors.value[field.fieldname]) {
    return 'calc((var(--h-row-mid) + 1px) * 2)';
  }

  return 'calc(var(--h-row-mid) + 1px)';
}

async function onChange(field: Field, value: DocValue) {
  const { fieldname } = field;
  delete errors.value[fieldname];

  let isSet = false;
  try {
    isSet = await props.doc.set(fieldname, value);
  } catch (err) {
    if (!(err instanceof Error)) {
      return;
    }

    errors.value[fieldname] = getErrorMessage(err, props.doc);
  }

  if (isSet) {
    setFormFields();
  }
}

function setFormFields() {
  let fieldList = props.fields;

  if (fieldList.length === 0) {
    fieldList = props.doc.quickEditFields;
  }

  if (fieldList.length === 0) {
    fieldList = props.doc.schema.fields.filter((f) => f.required);
  }

  formFields.value = fieldList.filter(
    (field) => field && !evaluateHidden(field, props.doc)
  );
}
</script>
