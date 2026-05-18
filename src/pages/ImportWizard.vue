<template>
  <div class="flex flex-col overflow-hidden w-full">
    <!-- Header -->
    <PageHeader :title="t`Import Wizard`">
      <DropdownWithActions
        v-if="hasImporter"
        :actions="actions"
        :disabled="isMakingEntries"
        :title="t`More`"
      />
      <Button
        v-if="hasImporter"
        :title="t`Add Row`"
        :disabled="isMakingEntries"
        :icon="true"
        @click="() => importer.addRow()"
      >
        <lucide-icon name="plus" class="w-4 h-4" />
      </Button>
      <Button
        v-if="hasImporter"
        :title="t`Save Template`"
        :icon="true"
        @click="saveTemplate"
      >
        <lucide-icon name="download" class="w-4 h-4" />
      </Button>
      <Button
        v-if="canImportData"
        :title="t`Import Data`"
        type="primary"
        :disabled="errorMessage.length > 0 || isMakingEntries"
        @click="importData"
      >
        {{ t`Import Data` }}
      </Button>
      <Button
        v-if="importType && !canImportData"
        :title="t`Select File`"
        type="primary"
        @click="selectFile"
      >
        {{ t`Select File` }}
      </Button>
    </PageHeader>

    <!-- Main Body of the Wizard -->
    <div class="flex text-base w-full flex-col">
      <!-- Select Import Type -->
      <div
        class="h-row-largest flex flex-row justify-start items-center w-full gap-2 border-b border-border p-4"
      >
        <AutoComplete
          :df="{
            fieldname: 'importType',
            label: t`Import Type`,
            fieldtype: 'AutoComplete',
            options: importableSchemaNames.map((value) => ({
              value,
              label: fyo.schemaMap[value]?.label ?? value,
            })),
          }"
          class="w-40"
          :border="true"
          :value="importType"
          size="small"
          @change="setImportType"
        />

        <p v-if="errorMessage.length > 0" class="text-base ms-2 text-error">
          {{ errorMessage }}
        </p>
        <p
          v-else
          class="text-base ms-2"
          :class="fileName ? 'text-main font-semibold' : 'text-description'"
        >
          <span v-if="fileName" class="font-normal">{{ t`Selected` }} </span>
          {{ helperMessage }}{{ fileName ? ',' : '' }}
          <span v-if="fileName" class="font-normal">
            {{ t`check values and click on` }} </span
          >{{ ' ' }}<span v-if="fileName">{{ t`Import Data.` }}</span>
          <span
            v-if="hasImporter && importer.valueMatrix.length > 0"
            class="font-normal"
            >{{
              ' ' +
              (importer.valueMatrix.length === 2
                ? t`${importer.valueMatrix.length} row added.`
                : t`${importer.valueMatrix.length} rows added.`)
            }}</span
          >
        </p>
      </div>

      <!-- Assignment Row and Value Grid container -->
      <div
        v-if="hasImporter"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
        style="max-height: calc(100vh - (2 * var(--h-row-largest)) - 2px)"
      >
        <!-- Column Assignment Row -->
        <div
          class="grid sticky top-0 py-4 pe-4 bg-surface border-b border-e border-border gap-4"
          style="z-index: 1; width: fit-content"
          :style="gridTemplateColumn"
        >
          <div class="index-cell">#</div>
          <Select
            v-for="index in columnIterator"
            :key="index"
            class="flex-shrink-0"
            size="small"
            :border="true"
            :df="gridColumnTitleDf"
            :value="importer.assignedTemplateFields[index]!"
            @change="
              (value: string | null) => importer.setTemplateField(index, value)
            "
          />
        </div>

        <!-- Values Grid -->
        <div
          v-if="importer.valueMatrix.length"
          class="grid py-4 pe-4 bg-surface gap-4 border-e last:border-b border-border"
          style="width: fit-content"
          :style="gridTemplateColumn"
        >
          <!-- Grid Value Row Cells, Allow Editing Values -->
          <template v-for="(row, ridx) of importer.valueMatrix" :key="ridx">
            <div
              class="index-cell group cursor-pointer"
              @click="importer.removeRow(ridx)"
            >
              <lucide-icon
                name="x"
                class="w-4 h-4 hidden group-hover:inline-block -me-1"
                :button="true"
              />
              <span class="group-hover:hidden">
                {{ ridx + 1 }}
              </span>
            </div>

            <template
              v-for="(val, cidx) of row.slice(0, columnCount)"
              :key="`cell-${ridx}-${cidx}`"
            >
              <!-- Raw Data Field if Column is Not Assigned -->
              <Data
                v-if="!importer.assignedTemplateFields[cidx]"
                :title="getFieldTitle(val)"
                :df="{
                  fieldtype: 'Data',
                  fieldname: 'tempField',
                  label: t`Temporary`,
                  placeholder: t`Select column`,
                }"
                size="small"
                :border="true"
                :value="
                  val.value != null
                    ? String(val.value)
                    : val.rawValue != null
                      ? String(val.rawValue)
                      : ''
                "
                :read-only="true"
              />

              <!-- FormControl Field if Column is Assigned -->
              <FormControl
                v-else
                :class="val.error ? 'border border-error/30 rounded-md' : ''"
                :title="getFieldTitle(val)"
                :df="
                  importer.templateFieldsMap.get(
                    importer.assignedTemplateFields[cidx]!
                  )
                "
                size="small"
                :rows="1"
                :border="true"
                :value="val.error ? null : val.value"
                :read-only="false"
                @change="
                  (value: DocValue) => {
                    importer.valueMatrix[ridx][cidx]!.error = false;
                    importer.valueMatrix[ridx][cidx]!.value = value;
                  }
                "
              />
            </template>
          </template>
        </div>

        <div
          v-else
          class="ps-4 text-description sticky left-0 flex items-center"
          style="height: 62.5px"
        >
          {{ t`No rows added. Select a file or add rows.` }}
        </div>
      </div>
    </div>

    <!-- Loading Bar when Saving Docs -->
    <Loading
      v-if="isMakingEntries"
      :open="isMakingEntries"
      :percent="percentLoading"
      :message="messageLoading"
    />

    <!-- Pick Column Modal -->
    <Modal
      :open-modal="showColumnPicker"
      @closemodal="showColumnPicker = false"
    >
      <div class="w-form">
        <!-- Pick Column Header -->
        <FormHeader :form-title="t`Pick Import Columns`" />
        <hr class="border-border" />

        <!-- Pick Column Checkboxes -->
        <div
          v-for="[key, value] of columnPickerFieldsMap.entries()"
          :key="key"
          class="p-4 max-h-80 overflow-auto custom-scroll custom-scroll-thumb1"
        >
          <h2 class="text-sm font-semibold text-main">
            {{ key }}
          </h2>
          <div class="grid grid-cols-3 border border-border rounded mt-1">
            <div
              v-for="tf of value"
              :key="tf.fieldKey"
              class="flex items-center"
            >
              <Check
                :df="{
                  fieldtype: 'Check',
                  fieldname: tf.fieldname,
                  label: tf.label,
                }"
                :show-label="true"
                :read-only="tf.required"
                :value="importer.templateFieldsPicked.get(tf.fieldKey)"
                @change="(value: boolean) => pickColumn(tf.fieldKey, value)"
              />
              <p v-if="tf.required" class="w-0 text-error -ml-4">*</p>
            </div>
          </div>
        </div>

        <!-- Pick Column Footer -->
        <hr class="border-border" />
        <div class="p-4 flex justify-between items-center">
          <p class="text-sm text-description">
            {{ t`${numColumnsPicked} fields selected` }}
          </p>
          <Button type="primary" @click="showColumnPicker = false">{{
            t`Done`
          }}</Button>
        </div>
      </div>
    </Modal>

    <!-- Import Completed Modal -->
    <Modal :open-modal="complete" @closemodal="clear">
      <div class="w-form">
        <!-- Import Completed Header -->
        <FormHeader :form-title="t`Import Complete`" />
        <hr class="border-border" />
        <!-- Success -->
        <div v-if="success.length > 0">
          <!-- Success Section Header -->
          <div class="flex justify-between px-4 pt-4 pb-1">
            <p class="text-base font-semibold text-main">
              {{ t`Success` }}
            </p>
            <p class="text-sm text-description">
              {{
                success.length === 1
                  ? t`${success.length} entry imported`
                  : t`${success.length} entries imported`
              }}
            </p>
          </div>
          <!-- Success Body -->
          <div class="max-h-40 overflow-auto text-main">
            <div
              v-for="(name, i) of success"
              :key="name"
              class="px-4 py-1 grid grid-cols-2 text-base gap-4"
              style="grid-template-columns: 1rem auto"
            >
              <div class="text-end">{{ i + 1 }}.</div>
              <p class="whitespace-nowrap overflow-auto no-scrollbar">
                {{ name }}
              </p>
            </div>
          </div>
          <hr class="border-border" />
        </div>

        <!-- Failed -->
        <div v-if="failed.length > 0">
          <!-- Failed Section Header -->
          <div class="flex justify-between px-4 pt-4 pb-1">
            <p class="text-base font-semibold">{{ t`Failed` }}</p>
            <p class="text-sm text-description">
              {{
                failed.length === 1
                  ? t`${failed.length} entry failed`
                  : t`${failed.length} entries failed`
              }}
            </p>
          </div>
          <!-- Failed Body -->
          <div class="max-h-40 overflow-auto text-main">
            <div
              v-for="(f, i) of failed"
              :key="f.name"
              class="px-4 py-1 grid grid-cols-2 text-base gap-4"
              style="grid-template-columns: 1rem 8rem auto"
            >
              <div class="text-end">{{ i + 1 }}.</div>
              <p class="whitespace-nowrap overflow-auto no-scrollbar">
                {{ f.name }}
              </p>
              <p class="whitespace-nowrap overflow-auto no-scrollbar">
                {{ f.error.message }}
              </p>
            </div>
          </div>
          <hr class="border-border" />
        </div>

        <!-- Fallback Div -->
        <div
          v-if="failed.length === 0 && success.length === 0"
          class="p-4 text-base text-main"
        >
          {{ t`No entries were imported.` }}
        </div>

        <!-- Footer Button -->
        <div class="flex justify-between p-4">
          <Button
            v-if="failed.length > 0"
            @click="clearSuccessfullyImportedEntries"
            >{{ t`Fix Failed` }}</Button
          >
          <Button
            v-if="failed.length === 0 && success.length > 0"
            @click="showMe"
            >{{ t`Show Me` }}</Button
          >
          <Button @click="clear">{{ t`Done` }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onActivated,
  onDeactivated,
} from 'vue';
import { useRouter } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Action } from 'fyo/model/types';
import { Verb } from 'fyo/telemetry/types';
import { ValidationError } from 'fyo/utils/errors';
import { ModelNameEnum } from 'models/types';
import { OptionField, RawValue, SelectOption } from 'schemas/types';
import Button from 'src/components/Button.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import Check from 'src/components/Controls/Check.vue';
import Data from 'src/components/Controls/Data.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Select from 'src/components/Controls/Select.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import FormHeader from 'src/components/FormHeader.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { Importer, TemplateField, getColumnLabel } from 'src/importer';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { showDialog } from 'src/utils/interactive';
import { docsPathMap } from 'src/utils/misc';
import { getSavePath, selectTextFile } from 'src/utils/ui';
import { useAppStore } from 'src/stores/app';
import Loading from '../components/Loading.vue';

// Router & App Store
const router = useRouter();
const store = useAppStore();

// Reactive State definitions
const showColumnPicker = ref(false);
const complete = ref(false);
const success = ref<string[]>([]);
const successOldName = ref<string[]>([]);
const failed = ref<{ name: string; error: Error }[]>([]);
const file = ref<null | { name: string; filePath: string; text: string }>(null);
const nullOrImporter = ref<any>(null);
const importType = ref('');
const isMakingEntries = ref(false);
const percentLoading = ref(0);
const messageLoading = ref('');

// Computed properties
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
    return t`Duplicate columns found: ${duplicates.value.join(', ')}`;
  }

  if (requiredNotSelected.value.length) {
    return t`Required fields not selected: ${requiredNotSelected.value.join(', ')}`;
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

const columnCount = computed(() => {
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

const hasImporter = computed(() => {
  return !!nullOrImporter.value;
});

const numColumnsPicked = computed(() => {
  if (!hasImporter.value) {
    return 0;
  }
  return [...importer.value.templateFieldsPicked.values()].filter(Boolean)
    .length;
});

const columnPickerFieldsMap = computed(() => {
  const map: Map<string, TemplateField[]> = new Map();
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

const importer = computed<any>(() => {
  if (!nullOrImporter.value) {
    throw new ValidationError(t`Importer not set, reload tool`, false);
  }

  return nullOrImporter.value;
});

const importableSchemaNames = computed(() => {
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

const actions = computed<Action[]>(() => {
  const list: Action[] = [];
  if (!hasImporter.value) {
    return list;
  }

  let selectFileLabel = t`Select File`;
  if (file.value) {
    selectFileLabel = t`Change File`;
  }

  if (canImportData.value) {
    list.push({
      label: selectFileLabel,
      component: {
        template: `<span>{{ "${selectFileLabel}" }}</span>`,
      },
      action: selectFile.bind(null),
    });
  }

  const pickColumnsAction = {
    label: t`Pick Import Columns`,
    component: {
      template: '<span>{{ t`Pick Import Columns` }}</span>',
    },
    action: () => (showColumnPicker.value = true),
  };

  const cancelAction = {
    label: t`Cancel`,
    component: {
      template: '<span class="text-error" >{{ t`Cancel` }}</span>',
    },
    action: clear.bind(null),
  };
  list.push(pickColumnsAction, cancelAction);

  return list;
});

const fileName = computed(() => {
  if (!file.value) {
    return '';
  }

  return file.value.name;
});

const helperMessage = computed(() => {
  if (!importType.value) {
    return t`Set an Import Type`;
  } else if (!fileName.value) {
    return '';
  }

  return fileName.value;
});

const isSubmittable = computed(() => {
  if (!hasImporter.value) {
    return false;
  }
  const sName = importer.value.schemaName;
  return fyo.schemaMap[sName]?.isSubmittable ?? false;
});

const gridColumnTitleDf = computed<OptionField>(() => {
  const options: SelectOption[] = [];
  if (!hasImporter.value) {
    return {
      fieldname: 'col',
      fieldtype: 'Select',
      options,
    } as OptionField;
  }

  for (const field of importer.value.templateFieldsMap.values()) {
    const val = field.fieldKey;
    if (!importer.value.templateFieldsPicked.get(val)) {
      continue;
    }

    const label = getColumnLabel(field);

    options.push({ value: val, label });
  }

  options.push({ value: '', label: t`None` });
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

// Watch Count Change
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

// Methods
const getFieldTitle = (vmi: {
  value?: DocValue;
  rawValue?: RawValue;
  error?: boolean;
}): string => {
  const title: string[] = [];
  if (vmi.value != null) {
    title.push(t`Value: ${String(vmi.value)}`);
  }

  if (vmi.rawValue != null) {
    title.push(t`Raw Value: ${String(vmi.rawValue)}`);
  }

  if (vmi.error) {
    title.push(t`Conversion Error`);
  }

  if (!title.length) {
    return t`No Value`;
  }

  return title.join(', ');
};

const pickColumn = (fieldKey: string, value: boolean): void => {
  importer.value.templateFieldsPicked.set(fieldKey, value);
  if (value) {
    return;
  }

  const idx = importer.value.assignedTemplateFields.findIndex(
    (f: any) => f === fieldKey
  );

  if (idx >= 0) {
    importer.value.assignedTemplateFields[idx] = null;
    reassignTemplateFields();
  }
};

const reassignTemplateFields = (): void => {
  if (importer.value.valueMatrix.length) {
    return;
  }

  for (let idx = 0; idx < importer.value.assignedTemplateFields.length; idx++) {
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
};

const showMe = async (): Promise<void> => {
  const sName = importer.value.schemaName;
  clear();
  await router.push(`/list/${sName}`);
};

const clear = (): void => {
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
};

const saveTemplate = async (): Promise<void> => {
  const template = importer.value.getCSVTemplate();
  const templateName = importType.value + ' ' + t`Template`;
  const { canceled, filePath } = await getSavePath(templateName, 'csv');

  if (canceled || !filePath) {
    return;
  }

  // @ts-ignore
  await ipc.saveData(template, filePath);
};

const preImportValidations = async (): Promise<boolean> => {
  const title = t`Cannot Import`;
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
      detail: t`Following cells have errors: ${cellErrors.join(', ')}.`,
    });
    return false;
  }

  const absentLinks = await importer.value.checkLinks();
  if (absentLinks.length) {
    await showDialog({
      title,
      type: 'error',
      detail: t`Following links do not exist: ${absentLinks
        .map((l: any) => `(${l.schemaLabel ?? l.schemaName}, ${l.name})`)
        .join(', ')}.`,
    });
    return false;
  }

  return true;
};

const askShouldSubmit = async (): Promise<boolean> => {
  if (!fyo.schemaMap[importType.value]?.isSubmittable) {
    return false;
  }

  let shouldSubmit = false;
  await showDialog({
    title: t`Submit entries?`,
    type: 'info',
    details: t`Should entries be submitted after syncing?`,
    buttons: [
      {
        label: t`Yes`,
        action() {
          shouldSubmit = true;
        },
        isPrimary: true,
      },
      {
        label: t`No`,
        action() {
          return null;
        },
        isEscape: true,
      },
    ],
  });

  return shouldSubmit;
};

const importData = async (): Promise<void> => {
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
};

const clearSuccessfullyImportedEntries = () => {
  const sName = importer.value.schemaName;
  const nameFieldKey = `${sName}.name`;
  const nameIndex = importer.value.assignedTemplateFields.findIndex(
    (n: any) => n === nameFieldKey
  );

  const failedEntriesValueMatrix = importer.value.valueMatrix.filter(
    (row: any) => {
      const value = row[nameIndex].value;
      if (typeof value !== 'string') {
        return false;
      }

      return !successOldName.value.includes(value);
    }
  );

  setImportType(importType.value);
  importer.value.valueMatrix = failedEntriesValueMatrix;
};

const setImportType = (type: string): void => {
  clear();
  if (!type) {
    return;
  }

  importType.value = type;
  nullOrImporter.value = new Importer(type, fyo);
};

const setLoadingStatus = (entriesMade: number, totalEntries: number): void => {
  percentLoading.value = entriesMade / totalEntries;
  messageLoading.value = isMakingEntries.value
    ? `${entriesMade} entries made out of ${totalEntries}...`
    : '';
};

const selectFile = async (): Promise<void> => {
  const { text, name, filePath } = await selectTextFile([
    { name: 'CSV', extensions: ['csv'] },
  ]);

  if (!text) {
    return;
  }

  const isValid = importer.value.selectFile(text);
  if (!isValid) {
    await showDialog({
      title: t`Cannot read file`,
      detail: t`Bad import data, could not read file.`,
      type: 'error',
    });
    return;
  }

  file.value = {
    name,
    filePath,
    text,
  };
};

// Lifecycles
onMounted(() => {
  if (store.isDevelopment) {
    // @ts-ignore
    window.iw = {
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
      gridTemplateColumn,
      duplicates,
      requiredNotSelected,
      errorMessage,
      canImportData,
      canSelectFile,
      columnCount,
      columnIterator,
      hasImporter,
      numColumnsPicked,
      columnPickerFieldsMap,
      importer,
      importableSchemaNames,
      actions,
      fileName,
      helperMessage,
      isSubmittable,
      gridColumnTitleDf,
      pickedArray,
    };
  }
});

onActivated(() => {
  store.docsPath = docsPathMap.ImportWizard ?? '';
});

onDeactivated(() => {
  store.docsPath = '';
  if (!complete.value) {
    return;
  }

  clear();
});
</script>

<style scoped>
@reference "../styles/index.css";
.index-cell {
  @apply flex pe-4 justify-end items-center border-e last:border-b border-border bg-surface sticky left-0 -my-4 text-description;
}
</style>
