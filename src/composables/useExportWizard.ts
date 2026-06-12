import { ref, computed } from 'vue';
import { Field, FieldTypeEnum } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { Verb } from 'fyo/telemetry/types';
import {
  getCsvExportData,
  getExportFields,
  getExportTableFields,
  getJsonExportData,
} from 'src/utils/export';
import { ExportField, ExportFormat, ExportTableField } from 'src/utils/types';
import { getSavePath, showExportInFolder } from 'src/utils/ui';
import { QueryFilter } from 'utils/db/types';
import { useApp } from 'src/composables/useApp';

const { t } = useApp();

export function useExportWizard(props: {
  schemaName: string;
  listFilters: QueryFilter;
  pageTitle?: string;
}) {
  const schemaFields = fyo.schemaMap[props.schemaName]?.fields ?? [];
  const exportFields = getExportFields(schemaFields);
  const exportTableFields = getExportTableFields(schemaFields, fyo);

  const limit = ref<number | null>(null);
  const useListFilters = ref<boolean>(true);
  const exportFormat = ref<ExportFormat>('csv');
  const fields = ref<ExportField[]>(exportFields);
  const tableFields = ref<ExportTableField[]>(exportTableFields);

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
        (acc, f) => f.fields.filter((field) => field.export).length + acc,
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
    let list: ExportField[] | undefined;

    if (!target) {
      list = fields.value;
    } else {
      list = tableFields.value.find((f) => f.target === target)?.fields;
    }

    if (!list) {
      return undefined;
    }

    return list.find((f) => f.fieldname === fieldname);
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

    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(filePath, data);

    fyo.telemetry.log(Verb.Exported, props.schemaName, {
      extension: exportFormat.value,
    });
    showExportInFolder(fyo.t`Export Successful`, filePath);
  }

  function getFileName() {
    const fileName = label.value.toLowerCase().replace(/\s/g, '-');
    const dateString = new Date().toISOString().split('T')[0];
    return `${fileName}_${dateString}`;
  }

  return {
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
    getExportField,
    setExportFieldValue,
    exportData,
    saveExportData,
    getFileName,
  };
}
