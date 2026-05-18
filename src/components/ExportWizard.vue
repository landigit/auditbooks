<template>
  <div>
    <!-- Export Wizard Header -->
    <FormHeader :form-title="label" :form-sub-title="t`Export Wizard`" />
    <hr class="border-border" />

    <!-- Export Config -->
    <div class="grid grid-cols-3 p-4 gap-4">
      <Check
        v-if="configFields.useListFilters && Object.keys(listFilters).length"
        :df="configFields.useListFilters"
        :space-between="true"
        :show-label="true"
        :label-right="false"
        :value="useListFilters"
        :border="true"
        @change="(value: boolean) => (useListFilters = value)"
      />
      <Select
        v-if="configFields.exportFormat"
        :df="configFields.exportFormat"
        :value="exportFormat"
        :border="true"
        @change="(value: ExportFormat) => (exportFormat = value)"
      />
      <Int
        v-if="configFields.limit"
        :df="configFields.limit"
        :value="limit ?? undefined"
        :border="true"
        @change="(value: number) => (limit = value)"
      />
    </div>
    <hr class="border-border" />

    <!-- Fields Selection -->
    <div class="max-h-80 overflow-auto custom-scroll custom-scroll-thumb2">
      <!-- Main Fields -->
      <div class="p-4">
        <h2 class="text-sm font-semibold text-main">
          {{ fyo.schemaMap[schemaName]?.label ?? schemaName }}
        </h2>
        <div class="grid grid-cols-3 border border-border rounded mt-1">
          <Check
            v-for="ef of fields"
            :key="ef.fieldname"
            :label-class="
              ef.fieldtype === 'Table'
                ? 'text-sm text-main font-semibold'
                : 'text-sm text-description'
            "
            :df="getField(ef)"
            :show-label="true"
            :value="ef.export"
            @change="(value: boolean) => setExportFieldValue(ef, value)"
          />
        </div>
      </div>

      <!-- Table Fields -->
      <div v-for="efs of filteredTableFields" :key="efs.fieldname" class="p-4">
        <h2 class="text-sm font-semibold text-muted">
          {{ fyo.schemaMap[efs.target]?.label ?? schemaName }}
        </h2>
        <div class="grid grid-cols-3 border border-border rounded mt-1">
          <Check
            v-for="ef of efs.fields"
            :key="ef.fieldname"
            label-class="text-description"
            :df="getField(ef)"
            :show-label="true"
            :value="ef.export"
            @change="
              (value: boolean) => setExportFieldValue(ef, value, efs.target)
            "
          />
        </div>
      </div>
    </div>

    <!-- Export Button -->
    <hr class="border-border" />
    <div class="p-4 flex justify-between items-center">
      <p class="text-sm text-description">
        {{ t`${numSelected} fields selected` }}
      </p>
      <Button type="primary" @click="exportData">{{ t`Export` }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed } from 'vue';
import { t } from 'fyo';
import { Verb } from 'fyo/telemetry/types';
import { Field, FieldTypeEnum } from 'schemas/types';
import { fyo } from 'src/initFyo';
import {
  getCsvExportData,
  getExportFields,
  getExportTableFields,
  getJsonExportData,
} from 'src/utils/export';
import { ExportField, ExportFormat, ExportTableField } from 'src/utils/types';
import { getSavePath, showExportInFolder } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import Button from './Button.vue';
import Check from './Controls/Check.vue';
import Int from './Controls/Int.vue';
import Select from './Controls/Select.vue';
import FormHeader from './FormHeader.vue';

// --- Props & Emits ---
const props = withDefaults(
  defineProps<{
    schemaName: string;
    listFilters?: QueryFilter;
    pageTitle?: string;
  }>(),
  {
    listFilters: () => ({}),
    pageTitle: undefined,
  }
);

// --- State ---
const _schemaFields = fyo.schemaMap[props.schemaName]?.fields ?? [];
const limit = ref<number | null>(null);
const useListFilters = ref(true);
const exportFormat = ref<ExportFormat>('csv');
const fields = ref<ExportField[]>(getExportFields(_schemaFields));
const tableFields = ref<ExportTableField[]>(getExportTableFields(_schemaFields, fyo));

// --- Computed ---
const label = computed(() => {
  if (props.pageTitle) {
    return props.pageTitle;
  }
  return fyo.schemaMap?.[props.schemaName]?.label ?? '';
});

const filteredTableFields = computed(() => {
  return tableFields.value.filter((f) => {
    const ef = getExportField(f.fieldname);
    return !!ef?.export;
  });
});

const numSelected = computed(() => {
  return (
    filteredTableFields.value.reduce(
      (acc, f) => f.fields.filter((subF) => subF.export).length + acc,
      0
    ) +
    fields.value.filter(
      (f) => f.fieldtype !== FieldTypeEnum.Table && f.export
    ).length
  );
});

const configFields = computed(() => {
  return {
    useListFilters: {
      fieldtype: 'Check',
      label: t`Use List Filters`,
      fieldname: 'useListFilters',
    } as Field,
    limit: {
      placeholder: 'Limit number of rows',
      fieldtype: 'Int',
      label: t`Limit`,
      fieldname: 'limit',
    } as Field,
    exportFormat: {
      fieldtype: 'Select',
      label: t`Export Format`,
      fieldname: 'exportFormat',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'csv', label: 'CSV' },
      ],
    } as Field,
  };
});

// --- Methods ---
function getField(ef: ExportField): Field {
  return {
    fieldtype: 'Check',
    label: ef.label,
    fieldname: ef.fieldname,
  };
}

function getExportField(
  fieldname: string,
  target?: string
): ExportField | undefined {
  let listFields: ExportField[] | undefined;

  if (!target) {
    listFields = fields.value;
  } else {
    listFields = tableFields.value.find((f) => f.target === target)?.fields;
  }

  if (!listFields) {
    return undefined;
  }

  return listFields.find((f) => f.fieldname === fieldname);
}

function setExportFieldValue(ef: ExportField, value: boolean, target?: string) {
  const field = getExportField(ef.fieldname, target);
  if (!field) {
    return;
  }

  field.export = value;
}

async function exportData() {
  const filters = JSON.parse(
    JSON.stringify(useListFilters.value ? props.listFilters : {})
  );

  let data: string;
  if (exportFormat.value === 'json') {
    data = await getJsonExportData(
      props.schemaName,
      fields.value,
      tableFields.value,
      limit.value,
      filters,
      fyo
    );
  } else {
    data = await getCsvExportData(
      props.schemaName,
      fields.value,
      tableFields.value,
      limit.value,
      filters,
      fyo
    );
  }

  await saveExportData(data);
}

async function saveExportData(data: string) {
  const fileName = getFileName();
  const { canceled, filePath } = await getSavePath(
    fileName,
    exportFormat.value
  );
  if (canceled || !filePath) {
    return;
  }

  await ipc.saveData(data, filePath);
  fyo.telemetry.log(Verb.Exported, props.schemaName, {
    extension: exportFormat.value,
  });
  showExportInFolder(t`Export Successful`, filePath);
}

function getFileName() {
  const fileStr = label.value.toLowerCase().replace(/\s/g, '-');
  const dateString = new Date().toISOString().split('T')[0];
  return `${fileStr}_${dateString}`;
}
</script>
