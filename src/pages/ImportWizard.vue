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
        <feather-icon name="plus" class="w-4 h-4" />
      </Button>
      <Button
        v-if="hasImporter"
        :title="t`Save Template`"
        :icon="true"
        @click="saveTemplate"
      >
        <feather-icon name="download" class="w-4 h-4" />
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
        class="flex flex-col md:flex-row justify-start items-start md:items-center w-full gap-2 border-b dark:border-gray-800 p-4 h-auto md:h-row-largest"
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

        <p v-if="errorMessage.length > 0" class="text-base ms-0 md:ms-2 text-red-500">
          {{ errorMessage }}
        </p>
        <p
          v-else
          class="text-base ms-0 md:ms-2"
          :class="
            fileName
              ? 'text-gray-900 dark:text-gray-25 font-semibold'
              : 'text-gray-700 dark:text-gray-200'
          "
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
          class="grid sticky top-0 py-4 pe-4 bg-white dark:bg-gray-875 border-b border-e dark:border-gray-800 gap-4"
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
            @change="(value: string | null) => importer.setTemplateField(index, value)"
          />
        </div>

        <!-- Values Grid -->
        <div
          v-if="importer.valueMatrix.length"
          class="grid py-4 pe-4 bg-white dark:bg-gray-875 gap-4 border-e last:border-b dark:border-gray-800"
          style="width: fit-content"
          :style="gridTemplateColumn"
        >
          <!-- Grid Value Row Cells, Allow Editing Values -->
          <template v-for="(row, ridx) of importer.valueMatrix" :key="ridx">
            <div
              class="index-cell group cursor-pointer"
              @click="importer.removeRow(ridx)"
            >
              <feather-icon
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
                :class="
                  val.error
                    ? 'border border-red-300 dark:border-red-600 rounded-md'
                    : ''
                "
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
                @change="(value: DocValue)=> {
                    importer.valueMatrix[ridx][cidx]!.error = false
                    importer.valueMatrix[ridx][cidx]!.value = value
                  }"
              />
            </template>
          </template>
        </div>

        <div
          v-else
          class="ps-4 text-gray-700 dark:text-gray-300 sticky left-0 flex items-center"
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
        <hr class="dark:border-gray-800" />

        <!-- Pick Column Checkboxes -->
        <div
          v-for="[key, value] of columnPickerFieldsMap.entries()"
          :key="key"
          class="p-4 max-h-80 overflow-auto custom-scroll custom-scroll-thumb1"
        >
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {{ key }}
          </h2>
          <div
            class="grid grid-cols-1 md:grid-cols-3 border dark:border-gray-800 rounded mt-1"
          >
            <div
              v-for="tf of value"
              :key="tf.fieldKey"
              class="flex items-center p-2"
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
                @change="(value:boolean) => pickColumn(tf.fieldKey, value)"
              />
              <p v-if="tf.required" class="w-0 text-red-600 -ml-4">*</p>
            </div>
          </div>
        </div>

        <!-- Pick Column Footer -->
        <hr class="dark:border-gray-800" />
        <div class="p-4 flex justify-between items-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
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
        <hr class="dark:border-gray-800" />
        <!-- Success -->
        <div v-if="success.length > 0">
          <!-- Success Section Header -->
          <div class="flex justify-between px-4 pt-4 pb-1">
            <p class="text-base font-semibold dark:text-gray-200">
              {{ t`Success` }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                success.length === 1
                  ? t`${success.length} entry imported`
                  : t`${success.length} entries imported`
              }}
            </p>
          </div>
          <!-- Success Body -->
          <div class="max-h-40 overflow-auto text-gray-900 dark:text-gray-55">
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
          <hr class="dark:border-gray-800" />
        </div>

        <!-- Failed -->
        <div v-if="failed.length > 0">
          <!-- Failed Section Header -->
          <div class="flex justify-between px-4 pt-4 pb-1">
            <p class="text-base font-semibold">{{ t`Failed` }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                failed.length === 1
                  ? t`${failed.length} entry failed`
                  : t`${failed.length} entries failed`
              }}
            </p>
          </div>
          <!-- Failed Body -->
          <div class="max-h-40 overflow-auto text-gray-900 dark:text-gray-55">
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
          <hr />
        </div>

        <!-- Fallback Div -->
        <div
          v-if="failed.length === 0 && success.length === 0"
          class="p-4 text-base dark:text-gray-200"
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
import { onMounted } from 'vue';
import { DocValue } from 'fyo/core/types';
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
import Loading from 'src/components/Loading.vue';
import { useApp } from 'src/composables/useApp';
import { useImportWizard } from 'src/pages/useImportWizard';

const { t, fyo } = useApp();
const {
  showColumnPicker,
  complete,
  success,
  successOldName,
  failed,
  file,
  importType,
  isMakingEntries,
  percentLoading,
  messageLoading,
  hasImporter,
  importer,
  gridTemplateColumn,
  errorMessage,
  canImportData,
  columnCount,
  columnIterator,
  numColumnsPicked,
  columnPickerFieldsMap,
  importableSchemaNames,
  fileName,
  helperMessage,
  gridColumnTitleDf,
  actions,
  getFieldTitle,
  pickColumn,
  showMe,
  clear,
  saveTemplate,
  importData,
  clearSuccessfullyImportedEntries,
  setImportType,
  selectFile,
} = useImportWizard();

onMounted(() => {
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.iw = {
      showColumnPicker,
      complete,
      success,
      successOldName,
      failed,
      file,
      importType,
      isMakingEntries,
      percentLoading,
      messageLoading,
      hasImporter,
      importer,
      gridTemplateColumn,
      errorMessage,
      canImportData,
      columnCount,
      columnIterator,
      numColumnsPicked,
      columnPickerFieldsMap,
      importableSchemaNames,
      fileName,
      helperMessage,
      gridColumnTitleDf,
      actions,
      getFieldTitle,
      pickColumn,
      showMe,
      clear,
      saveTemplate,
      importData,
      clearSuccessfullyImportedEntries,
      setImportType,
      selectFile,
    };
  }
});
</script>

<style scoped>
.index-cell {
  @apply flex pe-4 justify-end items-center border-e last:border-b dark:border-gray-800 bg-white dark:bg-gray-875 sticky left-0 -my-4 text-gray-600 dark:text-gray-400;
}
</style>
