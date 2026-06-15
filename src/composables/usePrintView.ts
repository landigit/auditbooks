import { ref, computed, onActivated, onUnmounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import { PrintTemplate } from 'models/baseModels/PrintTemplate';
import { ModelNameEnum } from 'models/types';
import { handleErrorWithDialog } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import { getPrintTemplatePropValues } from 'src/utils/printTemplates';
import { showSidebar } from 'src/utils/refs';
import { PrintValues } from 'src/utils/types';
import { getFormRoute, openSettings, routeTo } from 'src/utils/ui';

export function usePrintView(props: { schemaName: string; name: string }) {
  const doc = ref<null | Doc>(null);
  const scale = ref(1);
  const values = ref<null | PrintValues>(null);
  const templateDoc = ref<null | PrintTemplate>(null);
  const templateName = ref<null | string>(null);
  const templateList = ref<string[]>([]);
  const printContainer = ref<any>(null);

  const helperMessage = computed(() => {
    if (!templateList.value.length) {
      const label = fyo.schemaMap[props.schemaName]?.label ?? props.schemaName;
      return fyo.t`No Print Templates not found for entry type ${label}`;
    }

    if (!templateDoc.value) {
      return fyo.t`Please select a Print Template`;
    }

    return '';
  });

  const printProps = computed<null | { template: string; values: PrintValues }>(
    () => {
      const vals = values.value;
      if (!vals) {
        return null;
      }

      const template = templateDoc.value?.template;
      if (!template) {
        return null;
      }

      return { values: vals, template };
    }
  );

  const actions = computed<Action[]>(() => {
    const actionsList = [
      {
        label: fyo.t`Print Settings`,
        group: fyo.t`View`,
        async action() {
          await openSettings(ModelNameEnum.PrintSettings);
        },
      },
      {
        label: fyo.t`New Template`,
        group: fyo.t`Create`,
        action: async () => {
          const newDoc = fyo.doc.getNewDoc(ModelNameEnum.PrintTemplate, {
            type: props.schemaName,
          });

          const route = getFormRoute(newDoc.schemaName, newDoc.name!);
          await routeTo(route);
        },
      },
    ];

    const templateDocName = templateDoc.value?.name;
    if (templateDocName) {
      actionsList.push({
        label: templateDocName,
        group: fyo.t`View`,
        action: async () => {
          const route = getFormRoute(
            ModelNameEnum.PrintTemplate,
            templateDocName
          );
          await routeTo(route);
        },
      });

      actionsList.push({
        label: fyo.t`Duplicate Template`,
        group: fyo.t`Create`,
        action: async () => {
          const newDoc = fyo.doc.getNewDoc(ModelNameEnum.PrintTemplate, {
            type: props.schemaName,
            template: templateDoc.value?.template,
          });

          const route = getFormRoute(newDoc.schemaName, newDoc.name!);
          await routeTo(route);
        },
      });
    }

    return actionsList;
  });

  async function initialize() {
    doc.value = await fyo.doc.getDoc(props.schemaName, props.name);
    await setTemplateList();
    await setTemplateFromDefault();
    if (!templateDoc.value && templateList.value.length) {
      await onTemplateNameChange(templateList.value[0]);
    }

    if (doc.value) {
      values.value = await getPrintTemplatePropValues(doc.value as Doc);
    }
  }

  function setScale() {
    scale.value = 1;
    const width = (templateDoc.value?.width ?? 21) * 37.8;
    let containerWidth = window.innerWidth - 32;
    if (showSidebar.value) {
      containerWidth -= 12 * 16;
    }

    scale.value = Math.min(containerWidth / width, 1);
  }

  function reset() {
    doc.value = null;
    values.value = null;
    templateList.value = [];
    templateDoc.value = null;
    scale.value = 1;
  }

  async function onTemplateNameChange(value: string | null): Promise<void> {
    if (!value) {
      templateDoc.value = null;
      return;
    }

    templateName.value = value;
    try {
      templateDoc.value = (await fyo.doc.getDoc(
        ModelNameEnum.PrintTemplate,
        templateName.value
      )) as PrintTemplate;
    } catch (error) {
      await handleErrorWithDialog(error);
    }
    setScale();
  }

  async function setTemplateList(): Promise<void> {
    const list = (await fyo.db.getAllRaw(ModelNameEnum.PrintTemplate, {
      filters: { type: props.schemaName },
    })) as { name: string }[];

    templateList.value = list.map(({ name }) => String(name));
  }

  async function savePDF(shouldPrint?: boolean) {
    const pc = printContainer.value;
    if (!pc?.savePDF) {
      return;
    }

    await pc.savePDF(doc.value?.name, shouldPrint);
  }

  async function setTemplateFromDefault() {
    const defaultName =
      props.schemaName[0].toLowerCase() +
      props.schemaName.slice(1) +
      ModelNameEnum.PrintTemplate;

    let defaultTemplateName;

    if (
      props.schemaName == ModelNameEnum.SalesInvoice &&
      (doc.value as Doc).isPOS
    ) {
      defaultTemplateName = fyo.singles.Defaults?.posPrintTemplate;

      const posProfileName = fyo.singles.POSSettings?.posProfile as string;

      if (posProfileName) {
        const posProfile = await fyo.doc.getDoc(
          ModelNameEnum.POSProfile,
          posProfileName
        );

        if (posProfile.posPrintTemplate) {
          defaultTemplateName = posProfile.posPrintTemplate;
        }
      }
    } else {
      defaultTemplateName = fyo.singles.Defaults?.get(defaultName);
    }

    if (typeof defaultTemplateName !== 'string') {
      return;
    }

    await onTemplateNameChange(defaultTemplateName);
  }

  onActivated(async () => {
    await initialize();
  });

  onUnmounted(() => {
    reset();
  });

  return {
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
    initialize,
    setScale,
    reset,
    onTemplateNameChange,
    setTemplateList,
    savePDF,
    setTemplateFromDefault,
  };
}
