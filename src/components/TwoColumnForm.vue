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
        :class="isMobile ? 'flex flex-col border-b dark:border-gray-800 py-1' : 'grid items-center border-b dark:border-gray-800'"
        :style="isMobile ? {} : {
          ...style,
          height: getFieldHeight(df),
        }"
      >
        <div :class="isMobile ? 'ps-4 pt-1.5 pb-0.5 text-xs text-gray-500 dark:text-gray-400' : 'ps-4 flex text-gray-600 dark:text-gray-400'">
          {{ df.label }}
        </div>

        <div
          :class="[
            isMobile ? 'px-4 pb-1.5' : 'py-2 pe-4',
            {
              'ps-2': df.fieldtype === 'AttachImage' && !isMobile,
            }
          ]"
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
          <div
            v-if="errors[df.fieldname]"
            class="text-sm text-red-600 mt-2 ps-2"
          >
            {{ errors[df.fieldname] }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import FormControl from 'src/components/Controls/FormControl.vue';
import { fyo } from 'src/initFyo';
import { getErrorMessage } from 'src/utils';
import { evaluateHidden } from 'src/utils/doc';
import Table from './Controls/Table.vue';
import { Field } from 'schemas/types';
import { DocValue } from 'fyo/core/types';
import { useBreakpoint } from 'src/composables/useBreakpoint.js';

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

const { isMobile } = useBreakpoint();

const formFields = ref<Field[]>([]);
const errors = ref<Record<string, string>>({});
const controls = ref<any>(null);

const style = computed(() => {
  const templateColumns = (props.columnRatio || [1, 1])
    .map((r) => `minmax(0, ${r}fr)`)
    .join(' ');
  return {
    'grid-template-columns': templateColumns,
  };
});

watch(() => props.doc, () => {
  setFormFields();
});

onMounted(() => {
  setFormFields();
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.tcf = {
      formFields,
      errors,
      setFormFields,
      onChange,
    };
  }
});

function getFieldHeight(field: Field) {
  if (isMobile.value) {
    return 'auto';
  }

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

defineExpose({
  setFormFields,
  errors,
  formFields,
  onChange,
});
</script>
