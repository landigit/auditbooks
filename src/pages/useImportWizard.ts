import { ref, computed, watch, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import { Action } from 'fyo/model/types';
import { Verb } from 'fyo/telemetry/types';
import { ValidationError } from 'fyo/utils/errors';
import { ModelNameEnum } from 'models/types';
import { OptionField, SelectOption } from 'schemas/types';
import { Importer, TemplateField, getColumnLabel } from 'src/importer';
import { fyo } from 'src/initFyo';
import { showDialog } from 'src/utils/interactive';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { getSavePath, selectTextFile } from 'src/utils/ui';

export type FileInfo = {
  name: string;
  filePath: string;
  text: string;
};

export function useImportWizard() {
  const router = useRouter();

  const showColumnPicker = ref(false);
  const complete = ref(false);
  const success = ref<string[]>([]);
  const successOldName = ref<string[]>([]);
  const failed = ref<{ name: string; error: Error }[]>([]);
  const file = ref<FileInfo | null>(null);
  const nullOrImporter = ref<Importer | null>(null);
  const importType = ref('');
  const isMakingEntries = ref(false);
  const percentLoading = ref(0);
  const messageLoading = ref('');

  const hasImporter = computed(() => !!nullOrImporter.value);

  const importer = computed(() => {
    if (!nullOrImporter.value) {
      throw new ValidationError(fyo.t`Importer not set, reload tool`, false);
    }
    return nullOrImporter.value;
  });

  const gridTemplateColumn = computed(() => {
    return `grid-template-columns: 4rem repeat(${columnCount.value}, 10rem)`;
  });

  const duplicates = computed<string[]>(() => {
    if (!hasImporter.value) {
      return [];
    }

    const dupes = new Set<string>();
    const assignedSet = new Set<string>();

    for (const key of importer.value.assignedTemplateFields) {
      if (!key) {
        continue;
      }

      const tf = importer.value.templateFieldsMap.get(key);
      if (assignedSet.has(key) && tf) {
        dupes.add(getColumnLabel(tf));
      }

      assignedSet.add(key);
    }

    return Array.from(dupes);
  });

  const requiredNotSelected = computed<string[]>(() => {
    if (!hasImporter.value) {
      return [];
    }

    const assigned = new Set(importer.value.assignedTemplateFields);
    return [...importer.value.templateFieldsMap.values()]
      .filter((f) => {
        if (assigned.has(f.fieldKey) || !f.required) {
          return false;
        }

        if (f.parentSchemaChildField && !f.parentSchemaChildField.required) {
          return false;
        }

        return f.required;
      })
      .map((f) => getColumnLabel(f));
  });

  const errorMessage = computed<string>(() => {
    if (duplicates.value.length) {
      return fyo.t`Duplicate columns found: ${duplicates.value.join(', ')}`;
    }

    if (requiredNotSelected.value.length) {
      return fyo.t`Required fields not selected: ${requiredNotSelected.value.join(', ')}`;
    }

    return '';
  });

  const canImportData = computed(() => {
    if (!hasImporter.value) {
      return false;
    }
    return importer.value.valueMatrix.length > 0;
  });

  const canSelectFile = computed(() => {
    return !file.value;
  });

  const columnCount = computed<number>(() => {
    if (!hasImporter.value) {
      return 0;
    }

    if (!file.value) {
      return numColumnsPicked.value;
    }

    if (!importer.value.valueMatrix.length) {
      return importer.value.assignedTemplateFields.length;
    }

    return Math.min(
      importer.value.assignedTemplateFields.length,
      importer.value.valueMatrix[0].length
    );
  });

  const columnIterator = computed<number[]>(() => {
    return Array(columnCount.value)
      .fill(null)
      .map((_, i) => i);
  });

  const numColumnsPicked = computed<number>(() => {
    if (!hasImporter.value) {
      return 0;
    }
    return [...importer.value.templateFieldsPicked.values()].filter(Boolean).length;
  });

  const columnPickerFieldsMap = computed<Map<string, TemplateField[]>>(() => {
    const map = new Map<string, TemplateField[]>();
    if (!hasImporter.value) {
      return map;
    }

    for (const value of importer.value.templateFieldsMap.values()) {
      let label = value.schemaLabel;
      if (value.parentSchemaChildField) {
        label = `${value.parentSchemaChildField.label} (${value.schemaLabel})`;
      }

      if (!map.has(label)) {
        map.set(label, []);
      }

      map.get(label)!.push(value);
    }

    return map;
  });

  const importableSchemaNames = computed<ModelNameEnum[]>(() => {
    const importables = [
      ModelNameEnum.SalesInvoice,
      ModelNameEnum.PurchaseInvoice,
      ModelNameEnum.Payment,
      ModelNameEnum.Party,
      ModelNameEnum.Item,
      ModelNameEnum.JournalEntry,
      ModelNameEnum.Tax,
      ModelNameEnum.Account,
      ModelNameEnum.Address,
      ModelNameEnum.NumberSeries,
    ];

    const hasInventory = fyo.doc.singles.AccountingSettings?.enableInventory;
    if (hasInventory) {
      importables.push(
        ModelNameEnum.StockMovement,
        ModelNameEnum.Shipment,
        ModelNameEnum.PurchaseReceipt,
        ModelNameEnum.Location
      );
    }

    return importables;
  });

  const fileName = computed<string>(() => {
    if (!file.value) {
      return '';
    }
    return file.value.name;
  });

  const helperMessage = computed<string>(() => {
    if (!importType.value) {
      return fyo.t`Set an Import Type`;
    } else if (!fileName.value) {
      return '';
    }
    return fileName.value;
  });

  const isSubmittable = computed<boolean>(() => {
    if (!hasImporter.value) {
      return false;
    }
    const schemaName = importer.value.schemaName;
    return fyo.schemaMap[schemaName]?.isSubmittable ?? false;
  });

  const gridColumnTitleDf = computed<OptionField>(() => {
    const options: SelectOption[] = [];
    if (hasImporter.value) {
      for (const field of importer.value.templateFieldsMap.values()) {
        const value = field.fieldKey;
        if (!importer.value.templateFieldsPicked.get(value)) {
          continue;
        }

        const label = getColumnLabel(field);
        options.push({ value, label });
      }
    }

    options.push({ value: '', label: fyo.t`None` });
    return {
      fieldname: 'col',
      fieldtype: 'Select',
      options,
    } as OptionField;
  });

  const pickedArray = computed<string[]>(() => {
    if (!hasImporter.value) {
      return [];
    }
    return [...importer.value.templateFieldsPicked.entries()]
      .filter(([, picked]) => picked)
      .map(([key]) => key);
  });

  const actions = computed<Action[]>(() => {
    const actionsList: Action[] = [];

    let selectFileLabel = fyo.t`Select File`;
    if (file.value) {
      selectFileLabel = fyo.t`Change File`;
    }

    if (canImportData.value) {
      actionsList.push({
        label: selectFileLabel,
        component: {
          template: `<span>{{ "${selectFileLabel}" }}</span>`,
        },
        action: selectFile,
      });
    }

    const pickColumnsAction = {
      label: fyo.t`Pick Import Columns`,
      component: {
        template: '<span>{{ t`Pick Import Columns` }}</span>',
      },
      action: () => (showColumnPicker.value = true),
    };

    const cancelAction = {
      label: fyo.t`Cancel`,
      component: {
        template: '<span class="text-red-700" >{{ t`Cancel` }}</span>',
      },
      action: clear,
    };
    actionsList.push(pickColumnsAction, cancelAction);

    return actionsList;
  });

  watch(columnCount, (val) => {
    if (!hasImporter.value) {
      return;
    }

    const possiblyAssigned = importer.value.assignedTemplateFields.length;
    if (val >= importer.value.assignedTemplateFields.length) {
      return;
    }

    for (let i = val; i < possiblyAssigned; i++) {
      importer.value.assignedTemplateFields[i] = null;
    }
  });

  onActivated(() => {
    docsPathRef.value = docsPathMap.ImportWizard ?? '';
  });

  onDeactivated(() => {
    docsPathRef.value = '';
    if (!complete.value) {
      return;
    }
    clear();
  });

  function getFieldTitle(vmi: any): string {
    const title: string[] = [];
    if (vmi.value != null) {
      title.push(fyo.t`Value: ${String(vmi.value)}`);
    }

    if (vmi.rawValue != null) {
      title.push(fyo.t`Raw Value: ${String(vmi.rawValue)}`);
    }

    if (vmi.error) {
      title.push(fyo.t`Conversion Error`);
    }

    if (!title.length) {
      return fyo.t`No Value`;
    }

    return title.join(', ');
  }

  function pickColumn(fieldKey: string, value: boolean): void {
    if (!hasImporter.value) {
      return;
    }
    importer.value.templateFieldsPicked.set(fieldKey, value);
    if (value) {
      return;
    }

    const idx = importer.value.assignedTemplateFields.findIndex(
      (f) => f === fieldKey
    );

    if (idx >= 0) {
      importer.value.assignedTemplateFields[idx] = null;
      reassignTemplateFields();
    }
  }

  function reassignTemplateFields(): void {
    if (!hasImporter.value || importer.value.valueMatrix.length) {
      return;
    }

    for (
      let idx = 0;
      idx < importer.value.assignedTemplateFields.length;
      idx++
    ) {
      importer.value.assignedTemplateFields[idx] = null;
    }

    let idx = 0;
    for (const [fieldKey, value] of importer.value.templateFieldsPicked) {
      if (!value) {
        continue;
      }

      importer.value.assignedTemplateFields[idx] = fieldKey;
      idx += 1;
    }
  }

  async function showMe(): Promise<void> {
    if (!hasImporter.value) {
      return;
    }
    const schemaName = importer.value.schemaName;
    clear();
    await router.push(`/list/${schemaName}`);
  }

  function clear(): void {
    file.value = null;
    success.value = [];
    successOldName.value = [];
    failed.value = [];
    nullOrImporter.value = null;
    importType.value = '';
    complete.value = false;
    isMakingEntries.value = false;
    percentLoading.value = 0;
    messageLoading.value = '';
  }

  async function saveTemplate(): Promise<void> {
    if (!hasImporter.value) {
      return;
    }
    const template = importer.value.getCSVTemplate();
    const templateName = importType.value + ' ' + fyo.t`Template`;
    const { canceled, filePath } = await getSavePath(templateName, 'csv');

    if (canceled || !filePath) {
      return;
    }

    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(filePath, template);
  }

  async function preImportValidations(): Promise<boolean> {
    const title = fyo.t`Cannot Import`;
    if (errorMessage.value.length) {
      await showDialog({
        title,
        type: 'error',
        detail: errorMessage.value,
      });
      return false;
    }

    const cellErrors = importer.value.checkCellErrors();
    if (cellErrors.length) {
      await showDialog({
        title,
        type: 'error',
        detail: fyo.t`Following cells have errors: ${cellErrors.join(', ')}.`,
      });
      return false;
    }

    const absentLinks = await importer.value.checkLinks();
    if (absentLinks.length) {
      await showDialog({
        title,
        type: 'error',
        detail: fyo.t`Following links do not exist: ${absentLinks
          .map((l) => `(${l.schemaLabel ?? l.schemaName}, ${l.name})`)
          .join(', ')}.`,
      });
      return false;
    }

    return true;
  }

  async function importData(): Promise<void> {
    const isValid = await preImportValidations();
    if (!isValid || isMakingEntries.value || complete.value) {
      return;
    }

    isMakingEntries.value = true;
    importer.value.populateDocs();

    const shouldSubmit = await askShouldSubmit();

    let doneCount = 0;
    for (const doc of importer.value.docs) {
      setLoadingStatus(doneCount, importer.value.docs.length);
      const oldName = doc.name ?? '';
      try {
        await doc.sync();
        if (shouldSubmit) {
          await doc.submit();
        }
        doneCount += 1;

        success.value.push(doc.name!);
        successOldName.value.push(oldName);
      } catch (error) {
        if (error instanceof Error) {
          failed.value.push({ name: doc.name!, error });
        }
      }
    }

    fyo.telemetry.log(Verb.Imported, importer.value.schemaName);
    isMakingEntries.value = false;
    complete.value = true;
  }

  async function askShouldSubmit(): Promise<boolean> {
    if (!fyo.schemaMap[importType.value]?.isSubmittable) {
      return false;
    }

    let shouldSubmit = false;
    await showDialog({
      title: fyo.t`Submit entries?`,
      type: 'info',
      details: fyo.t`Should entries be submitted after syncing?`,
      buttons: [
        {
          label: fyo.t`Yes`,
          action() {
            shouldSubmit = true;
          },
          isPrimary: true,
        },
        {
          label: fyo.t`No`,
          action() {
            return null;
          },
          isEscape: true,
        },
      ],
    });

    return shouldSubmit;
  }

  function clearSuccessfullyImportedEntries() {
    if (!hasImporter.value) {
      return;
    }
    const schemaName = importer.value.schemaName;
    const nameFieldKey = `${schemaName}.name`;
    const nameIndex = importer.value.assignedTemplateFields.findIndex(
      (n) => n === nameFieldKey
    );

    const failedEntriesValueMatrix = importer.value.valueMatrix.filter(
      (row) => {
        const value = row[nameIndex].value;
        if (typeof value !== 'string') {
          return false;
        }

        return !successOldName.value.includes(value);
      }
    );

    setImportType(importType.value);
    importer.value.valueMatrix = failedEntriesValueMatrix;
  }

  function setImportType(newType: string): void {
    clear();
    if (!newType) {
      return;
    }

    importType.value = newType;
    nullOrImporter.value = new Importer(newType, fyo);
  }

  function setLoadingStatus(entriesMade: number, totalEntries: number): void {
    percentLoading.value = entriesMade / totalEntries;
    messageLoading.value = isMakingEntries.value
      ? `${entriesMade} entries made out of ${totalEntries}...`
      : '';
  }

  async function selectFile(): Promise<void> {
    if (!hasImporter.value) {
      return;
    }
    const { text, name, filePath } = await selectTextFile([
      { name: 'CSV', extensions: ['csv'] },
    ]);

    if (!text) {
      return;
    }

    const isValid = importer.value.selectFile(text);
    if (!isValid) {
      await showDialog({
        title: fyo.t`Cannot read file`,
        detail: fyo.t`Bad import data, could not read file.`,
        type: 'error',
      });
      return;
    }

    file.value = {
      name,
      filePath,
      text,
    };
  }

  return {
    showColumnPicker,
    complete,
    success,
    successOldName,
    failed,
    file,
    nullOrImporter,
    importType,
    isMakingEntries,
    percentLoading,
    messageLoading,
    hasImporter,
    importer,
    gridTemplateColumn,
    duplicates,
    requiredNotSelected,
    errorMessage,
    canImportData,
    canSelectFile,
    columnCount,
    columnIterator,
    numColumnsPicked,
    columnPickerFieldsMap,
    importableSchemaNames,
    fileName,
    helperMessage,
    isSubmittable,
    gridColumnTitleDf,
    pickedArray,
    actions,
    getFieldTitle,
    pickColumn,
    reassignTemplateFields,
    showMe,
    clear,
    saveTemplate,
    importData,
    clearSuccessfullyImportedEntries,
    setImportType,
    selectFile,
  };
}
