<template>
  <div>
    <!-- Export Wizard Header -->
    <FormHeader :form-title="label" :form-sub-title="t`Export Wizard`" />
    <hr class="dark:border-gray-800" />

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
    <hr class="dark:border-gray-800" />

    <!-- Fields Selection -->
    <div class="max-h-80 overflow-auto custom-scroll custom-scroll-thumb2">
      <!-- Main Fields -->
      <div class="p-4">
        <h2 class="text-sm font-semibold text-foreground">
          {{ fyo.schemaMap[schemaName]?.label ?? schemaName }}
        </h2>
        <div
          class="grid grid-cols-3 border dark:border-gray-800 rounded mt-1"
          style="display: grid !important; height: auto !important;"
        >
          <Check
            v-for="ef of fields"
            :key="ef.fieldname"
            :label-class="
              ef.fieldtype === 'Table'
                ? 'text-sm text-foreground font-semibold'
                : 'text-sm text-foreground'
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
        <h2 class="text-sm font-semibold text-foreground">
          {{ fyo.schemaMap[efs.target]?.label ?? schemaName }}
        </h2>
        <div
          class="grid grid-cols-3 border dark:border-gray-800 rounded mt-1"
          style="display: grid !important; height: auto !important;"
        >
          <Check
            v-for="ef of efs.fields"
            :key="ef.fieldname"
            label-class="text-sm text-foreground"
            :df="getField(ef)"
            :show-label="true"
            :value="ef.export"
            @change="(value: boolean) => setExportFieldValue(ef, value, efs.target)"
          />
        </div>
      </div>
    </div>

    <!-- Export Button -->
    <hr class="dark:border-gray-800" />
    <div class="p-4 flex justify-between items-center">
      <p class="text-sm text-muted-foreground">
        {{ t`${numSelected} fields selected` }}
      </p>
      <Button type="primary" @click="exportData">{{ t`Export` }}</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApp } from 'src/composables/useApp.js';
import { ExportFormat } from 'src/utils/types';
import { QueryFilter } from 'utils/db/types';
import Button from './Button.vue';
import Check from './Controls/Check.vue';
import Int from './Controls/Int.vue';
import Select from './Controls/Select.vue';
import FormHeader from './FormHeader.vue';
import { useExportWizard } from '../composables/useExportWizard.js';

const { t, fyo } = useApp();

const props = withDefaults(
  defineProps<{
    schemaName: string;
    listFilters?: QueryFilter;
    pageTitle?: string;
  }>(),
  {
    listFilters: () => ({}),
  }
);

const {
  limit,
  useListFilters,
  exportFormat,
  fields,
  tableFields,
  label,
  filteredTableFields,
  numSelected,
  configFields,
  getField,
  setExportFieldValue,
  exportData,
} = useExportWizard(props);
</script>
