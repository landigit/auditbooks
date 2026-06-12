<template>
  <div class="flex flex-col flex-1 bg-gray-25 dark:bg-gray-875">
    <PageHeader :border="true" :title="t`Print View`">
      <AutoComplete
        v-if="templateList.length"
        :df="{
          fieldtype: 'AutoComplete',
          fieldname: 'templateName',
          label: t`Template Name`,
          options: templateList.map((n) => ({ label: n, value: n })),
        }"
        input-class="text-base py-0 h-8"
        class="w-40"
        :border="true"
        :value="templateName ?? ''"
        @change="onTemplateNameChange"
      />
      <DropdownWithActions :actions="actions" :title="t`More`" />
      <Button class="text-xs" type="primary" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <!-- Template Display Area -->
    <div class="overflow-auto custom-scroll custom-scroll-thumb1 p-4">
      <!-- Display Hints -->
      <div
        v-if="helperMessage"
        class="text-sm text-gray-700 dark:text-gray-300"
      >
        {{ helperMessage }}
      </div>

      <!-- Template Container -->
      <PrintContainer
        v-if="printProps"
        ref="printContainer"
        :print-schema-name="schemaName"
        :template="printProps.template"
        :values="printProps.values"
        :scale="scale"
        :width="templateDoc?.width"
        :height="templateDoc?.height"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Button from 'src/components/Button.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import PageHeader from 'src/components/PageHeader.vue';
import PrintContainer from 'src/pages/TemplateBuilder/PrintContainer.vue';
import { useApp } from 'src/composables/useApp';
import { usePrintView } from 'src/pages/PrintView/usePrintView';

const props = defineProps<{
  schemaName: string;
  name: string;
}>();

const { t, fyo } = useApp();

const {
  doc,
  scale,
  values,
  templateDoc,
  templateName,
  templateList,
  printContainer,
  helperMessage,
  printProps,
  actions,
  onTemplateNameChange,
  savePDF,
} = usePrintView(props);

onMounted(() => {
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.pv = {
      doc,
      scale,
      values,
      templateDoc,
      templateName,
      templateList,
      printContainer,
      helperMessage,
      printProps,
      actions,
      onTemplateNameChange,
      savePDF,
    };
  }
});
</script>
