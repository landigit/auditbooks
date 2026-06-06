<template>
  <view class="flex flex-col flex-1 bg-canvas">
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
      <Button class="text-xs" type="primary" @tap="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @tap="savePDF(true)">
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <!-- Template Display Area -->
    <view class="overflow-auto custom-scroll custom-scroll-thumb1 p-4">
      <!-- Display Hints -->
      <view v-if="helperMessage" class="text-sm text-muted">
        {{ helperMessage }}
      </view>

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
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onActivated,
  onUnmounted,
  onDeactivated,
} from 'vue';
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import { PrintTemplate } from 'models/baseModels/PrintTemplate';
import { ModelNameEnum } from 'models/types';
import Button from 'src/components/Button.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { handleErrorWithDialog } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { getPrintTemplatePropValues } from 'src/utils/printTemplates';
import { PrintValues } from 'src/utils/types';
import { getFormRoute, openSettings, routeTo } from 'src/utils/ui';
import { useAppStore } from 'src/stores/app';
import PrintContainer from '../TemplateBuilder/PrintContainer.vue';

// Define Props
const props = defineProps<{
  schemaName: string;
  name: string;
}>();

// App Store
const store = useAppStore();

// Template Refs
const printContainer = ref<InstanceType<typeof PrintContainer> | null>(null);

// Reactive State
const doc = ref<Doc | null>(null);
const scale = ref(1);
const values = ref<PrintValues | null>(null);
const templateDoc = ref<PrintTemplate | null>(null);
const templateName = ref<string | null>(null);
const templateList = ref<string[]>([]);

// Computed Properties
const helperMessage = computed(() => {
  if (!templateList.value.length) {
    const label = fyo.schemaMap[props.schemaName]?.label ?? props.schemaName;
    return t`No Print Templates not found for entry type ${label}`;
  }

  if (!templateDoc.value) {
    return t`Please select a Print Template`;
  }

  return '';
});

const printProps = computed(() => {
  const vals = values.value;
  if (!vals) {
    return null;
  }

  const template = templateDoc.value?.template;
  if (!template) {
    return null;
  }

  return { values: vals, template };
});

const actions = computed<Action[]>(() => {
  const acts: Action[] = [
    {
      label: t`Print Settings`,
      group: t`View`,
      async action() {
        await openSettings(ModelNameEnum.PrintSettings);
      },
    },
    {
      label: t`New Template`,
      group: t`Create`,
      action: async () => {
        const d = fyo.doc.getNewDoc(ModelNameEnum.PrintTemplate, {
          type: props.schemaName,
        });

        const route = getFormRoute(d.schemaName, d.name!);
        await routeTo(route);
      },
    },
  ];

  const templateDocName = templateDoc.value?.name;
  if (templateDocName) {
    acts.push({
      label: templateDocName,
      group: t`View`,
      action: async () => {
        const route = getFormRoute(
          ModelNameEnum.PrintTemplate,
          templateDocName
        );
        await routeTo(route);
      },
    });

    acts.push({
      label: t`Duplicate Template`,
      group: t`Create`,
      action: async () => {
        const d = fyo.doc.getNewDoc(ModelNameEnum.PrintTemplate, {
          type: props.schemaName,
          template: templateDoc.value?.template,
        });

        const route = getFormRoute(d.schemaName, d.name!);
        await routeTo(route);
      },
    });
  }

  return acts;
});

// Methods
const setScale = () => {
  scale.value = 1;
  const widthVal = (templateDoc.value?.width ?? 21) * 37.8;
  let containerWidth = window.innerWidth - 32;
  if (store.showSidebar) {
    containerWidth -= 12 * 16;
  }

  scale.value = Math.min(containerWidth / widthVal, 1);
};

const onTemplateNameChange = async (value: string | null) => {
  if (!value) {
    templateDoc.value = null;
    return;
  }

  templateName.value = value;
  try {
    templateDoc.value = await fyo.doc.getDoc(
      ModelNameEnum.PrintTemplate,
      templateName.value
    );
  } catch (error) {
    await handleErrorWithDialog(error);
  }
  setScale();
};

const setTemplateList = async () => {
  const list = (await fyo.db.getAllRaw(ModelNameEnum.PrintTemplate, {
    filters: { type: props.schemaName },
  })) as { name: string }[];

  templateList.value = list.map(({ name }) => name);
};

const setTemplateFromDefault = async () => {
  const defaultName =
    props.schemaName[0].toLowerCase() +
    props.schemaName.slice(1) +
    ModelNameEnum.PrintTemplate;

  let templateNameVal;

  if (
    props.schemaName == ModelNameEnum.SalesInvoice &&
    (doc.value as Doc).isPOS
  ) {
    templateNameVal = fyo.singles.Defaults?.posPrintTemplate;

    const posProfileName = fyo.singles.POSSettings?.posProfile as string;

    if (posProfileName) {
      const posProfile = await fyo.doc.getDoc(
        ModelNameEnum.POSProfile,
        posProfileName
      );

      if (posProfile.posPrintTemplate) {
        templateNameVal = posProfile.posPrintTemplate;
      }
    }
  } else {
    templateNameVal = fyo.singles.Defaults?.get(defaultName);
  }

  if (typeof templateNameVal !== 'string') {
    return;
  }

  await onTemplateNameChange(templateNameVal);
};

const initialize = async () => {
  doc.value = await fyo.doc.getDoc(props.schemaName, props.name);
  await setTemplateList();
  await setTemplateFromDefault();
  if (!templateDoc.value && templateList.value.length) {
    await onTemplateNameChange(templateList.value[0]);
  }

  if (doc.value) {
    values.value = await getPrintTemplatePropValues(
      doc.value as unknown as Doc
    );
  }
};

const reset = () => {
  doc.value = null;
  values.value = null;
  templateList.value = [];
  templateDoc.value = null;
  scale.value = 1;
};

const savePDF = async (shouldPrint?: boolean) => {
  if (!printContainer.value?.savePDF) {
    return;
  }

  await printContainer.value.savePDF(doc.value?.name, shouldPrint);
};

// Lifecycles
onMounted(async () => {
  await initialize();
  if (store.isDevelopment) {
    // @ts-ignore
    window.pv = {
      doc,
      scale,
      values,
      templateDoc,
      templateName,
      templateList,
      helperMessage,
      printProps,
      actions,
      setScale,
      onTemplateNameChange,
      setTemplateList,
      setTemplateFromDefault,
      initialize,
      reset,
      savePDF,
    };
  }
});

onActivated(async () => {
  await initialize();
});

onUnmounted(() => {
  reset();
});

onDeactivated(() => {
  reset();
});
</script>
