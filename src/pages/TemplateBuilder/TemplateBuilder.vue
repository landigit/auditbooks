<template>
  <div>
    <PageHeader :title="doc && doc.inserted ? doc.name : ''">
      <!-- Template Name -->
      <template v-if="doc && !doc.inserted" #left>
        <FormControl
          ref="nameField"
          class="w-60 flex-shrink-0"
          size="small"
          :input-class="['font-semibold text-xl']"
          :df="fields.name"
          :border="true"
          :value="doc!.name"
          @change="async (value) => await doc?.set('name', value)"
        />
      </template>
      <Button v-if="displayDoc && doc?.template" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button v-if="displayDoc && doc?.template" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
      <Button
        v-if="doc && doc.isCustom && displayDoc"
        :title="t`Toggle Edit Mode`"
        :icon="true"
        @click="toggleEditMode"
      >
        <lucide-icon name="edit" class="w-4 h-4" />
      </Button>
      <DropdownWithActions v-if="actions.length" :actions="actions" />
      <Button v-if="doc?.canSave" type="primary" @click="sync()">
        {{ t`Save` }}
      </Button>
    </PageHeader>

    <!-- Template Builder Body -->
    <div
      v-if="doc"
      class="w-full bg-canvas-muted grid"
      :style="templateBuilderBodyStyles"
    >
      <!-- Template Display Area -->
      <div
        class="overflow-auto no-scrollbar flex flex-col"
        :style="templateDisplayStyles"
      >
        <!-- Template Container -->
        <div
          v-if="canDisplayPreview"
          class="p-4 overflow-auto custom-scroll custom-scroll-thumb1"
        >
          <PrintContainer
            ref="printContainer"
            :print-schema-name="displayDoc!.schemaName"
            :template="doc.template!"
            :values="values!"
            :scale="scale"
            :height="doc.height"
            :width="doc.width"
          />
        </div>

        <!-- Display Hints -->
        <p v-else-if="helperMessage" class="text-sm text-description p-4">
          {{ helperMessage }}
        </p>

        <!-- Bottom Bar -->
        <div
          class="w-full sticky bottom-0 flex bg-surface border-t border-border mt-auto flex-shrink-0"
        >
          <!-- Entry Type -->
          <FormControl
            :title="fields.type.label"
            class="w-40 border-r border-border flex-shrink-0"
            :df="fields.type"
            :border="false"
            :value="doc.get('type')"
            :container-styles="{ 'border-radius': '0px' }"
            @change="async (value) => await setType(value)"
          />
          <!-- Display Doc -->
          <Link
            v-if="doc.type"
            :title="displayDocField.label"
            class="w-40 border-r border-border flex-shrink-0"
            :df="displayDocField"
            :border="false"
            :value="displayDoc?.name"
            :container-styles="{ 'border-radius': '0px' }"
            @change="(value: string) => setDisplayDoc(value)"
          />

          <!-- Display Scale -->
          <div
            v-if="canDisplayPreview"
            class="flex ml-auto gap-2 px-2 w-36 justify-between flex-shrink-0"
          >
            <p class="text-sm text-description my-auto">
              {{ t`Display Scale` }}
            </p>
            <input
              type="number"
              class="my-auto w-10 text-base text-end bg-transparent text-main"
              :value="scale"
              min="0.1"
              max="10"
              step="0.1"
              @change="setScale"
              @input="setScale"
            />
          </div>
        </div>
      </div>

      <!-- Input Panel Resizer -->
      <HorizontalResizer
        :initial-x="panelWidth"
        :min-x="22 * 16"
        :max-x="maxWidth"
        style="z-index: 5"
        @resize="(x: number) => (panelWidth = x)"
      />

      <!-- Template Panel -->
      <div
        class="border-l border-border bg-surface flex flex-col"
        :style="templateDisplayStyles"
      >
        <!-- Template Editor -->
        <div class="min-h-0">
          <TemplateEditor
            v-if="typeof doc.template === 'string' && hints"
            ref="templateEditor"
            class="overflow-auto custom-scroll custom-scroll-thumb1 h-full"
            :initial-value="doc.template"
            :disabled="!doc.isCustom"
            :hints="hints"
            @input="() => (templateChanged = true)"
            @blur="(value: string) => setTemplate(value)"
          />
        </div>
        <div
          v-if="templateChanged"
          class="flex gap-2 p-2 text-sm text-description items-center mt-auto border-t border-border"
        >
          <ShortcutKeys :keys="applyChangesShortcut" :simple="true" />
          {{ t` to apply changes` }}
        </div>

        <!-- Value Key Hints Container -->
        <div
          v-if="hints"
          class="border-t border-border flex-shrink-0"
          :class="templateChanged ? '' : 'mt-auto'"
        >
          <!-- Value Key Toggle -->
          <div
            class="flex justify-between items-center cursor-pointer select-none p-2"
            @click="toggleShowHints"
          >
            <h2 class="text-base text-main font-semibold">
              {{ t`Key Hints` }}
            </h2>
            <lucide-icon
              :name="showHints ? 'chevron-up' : 'chevron-down'"
              class="w-4 h-4 text-description resize-none"
            />
          </div>

          <!-- Value Key Hints -->
          <Transition name="hints">
            <div
              v-if="showHints"
              class="overflow-auto custom-scroll custom-scroll-thumb1 p-2 border-t border-border"
              style="max-height: 30vh"
            >
              <TemplateBuilderHint :hints="hints" />
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <Modal
      v-if="doc"
      :open-modal="showSizeModal"
      @closemodal="showSizeModal = !showSizeModal"
    >
      <SetPrintSize :doc="doc" @done="showSizeModal = !showSizeModal" />
    </Modal>
    <Modal
      v-if="doc"
      :open-modal="showTypeModal"
      @closemodal="showTypeModal = !showTypeModal"
    >
      <SetType :doc="doc" @done="showTypeModal = !showTypeModal" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onActivated,
  onDeactivated,
  inject,
  provide,
} from 'vue';
import { EditorView } from 'codemirror';
import { Doc } from 'fyo/model/doc';
import { ModelNameEnum } from 'models/types';
import { saveExportData } from 'reports/commonExporter';
import { Field, TargetField } from 'schemas/types';
import Button from 'src/components/Button.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Link from 'src/components/Controls/Link.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import HorizontalResizer from 'src/components/HorizontalResizer.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ShortcutKeys from 'src/components/ShortcutKeys.vue';
import { handleErrorWithDialog } from 'src/errorHandling';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { showDialog, showToast } from 'src/utils/interactive';
import { docsPathMap } from 'src/utils/misc';
import {
  PrintTemplateHint,
  baseTemplate,
  getPrintTemplatePropHints,
  getPrintTemplatePropValues,
} from 'src/utils/printTemplates';
import { PrintValues } from 'src/utils/types';
import {
  ShortcutKey,
  focusOrSelectFormControl,
  getActionsForDoc,
  getDocFromNameIfExistsElseNew,
  getSavePath,
  openSettings,
  selectTextFile,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { getMapFromList } from 'utils/index';
import { useAppStore } from 'src/stores/app';
import PrintContainer from './PrintContainer.vue';
import SetPrintSize from './SetPrintSize.vue';
import SetType from './SetType.vue';
import TemplateBuilderHint from './TemplateBuilderHint.vue';
import TemplateEditor from './TemplateEditor.vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

// Define Props
const props = defineProps<{
  name: string;
}>();

// App Store & Context Injections
const store = useAppStore();
const shortcuts = inject(shortcutsKey);
const doc = ref<any>(null);

let context = 'TemplateBuilder';
if (shortcuts) {
  context = useDocShortcuts(shortcuts, doc as any, context, false);
}

// Provide document context to child elements
provide('doc', doc);

// Template Refs
const printContainer = ref<InstanceType<typeof PrintContainer> | null>(null);
const templateEditor = ref<InstanceType<typeof TemplateEditor> | null>(null);
const nameField = ref<InstanceType<typeof FormControl> | null>(null);

// Reactive State
const editMode = ref(false);
const showHints = ref(false);
const hints = ref<PrintTemplateHint | undefined>(undefined);
const values = ref<PrintValues | null>(null);
const displayDoc = ref<Doc | null>(null);
const scale = ref(0.6);
const panelWidth = ref(22 * 16);
const templateChanged = ref(false);
const showTypeModal = ref(false);
const showSizeModal = ref(false);

const preEditMode = ref({
  scale: 0.6,
  showSidebar: true,
  panelWidth: 22 * 16,
});

// Computed Properties
const canDisplayPreview = computed<boolean>(() => {
  if (!displayDoc.value || !values.value) {
    return false;
  }

  if (!doc.value?.template) {
    return false;
  }

  return true;
});

const applyChangesShortcut = computed(() => {
  return [ShortcutKey.ctrl, ShortcutKey.enter];
});

const view = computed<EditorView | null>(() => {
  // @ts-ignore
  const v = templateEditor.value?.view;
  if (v instanceof EditorView) {
    return v;
  }
  return null;
});

const maxWidth = computed(() => {
  return window.innerWidth - 12 * 16 - 100;
});

const fields = computed<Record<string, Field>>(() => {
  return getMapFromList(fyo.schemaMap.PrintTemplate?.fields ?? [], 'fieldname');
});

const displayDocField = computed<TargetField>(() => {
  const target = doc.value?.type ?? ModelNameEnum.SalesInvoice;
  return {
    fieldname: 'displayDoc',
    label: t`Display Doc`,
    fieldtype: 'Link',
    target,
  };
});

const helperMessage = computed(() => {
  if (!doc.value) {
    return '';
  }

  if (!doc.value.type) {
    return t`Select a Template type`;
  }

  if (!displayDoc.value) {
    return t`Select a Display Doc to view the Template`;
  }

  if (!doc.value.template) {
    return t`Set a Template value to see the Print Template`;
  }

  return '';
});

const templateBuilderBodyStyles = computed<Record<string, string>>(() => {
  const styles: Record<string, string> = {};
  styles['grid-template-columns'] = `auto 0px ${panelWidth.value}px`;
  styles['height'] = 'calc(100vh - var(--h-row-largest) - 1px)';
  return styles;
});

const templateDisplayStyles = computed<Record<string, string>>(() => {
  const styles: Record<string, string> = {};
  styles.height = `calc(100vh - var(--h-row-largest) - 1px - ${
    store.platform == 'Windows' ? 'var(--h-row-smallest)' : '0px'
  })`;
  return styles;
});

// Methods
const getTemplateEditorState = () => {
  const fallback = doc.value?.template ?? '';
  if (!view.value) {
    return fallback;
  }
  return view.value.state.doc.toString();
};

const setTemplate = async (value?: string) => {
  templateChanged.value = false;
  if (!doc.value?.isCustom) {
    return;
  }

  value ??= getTemplateEditorState();
  await doc.value?.set('template', value);
};

const setScale = (e: Event | number) => {
  let val = scale.value;
  if (typeof e === 'number') {
    val = Number(e.toFixed(2));
  } else if (e instanceof Event && e.target instanceof HTMLInputElement) {
    val = Number(e.target.value);
  }

  scale.value = Math.max(Math.min(val, 10), 0.15);
};

const toggleShowHints = () => {
  showHints.value = !showHints.value;
};

const getEditModeScale = (): number => {
  const div = printContainer.value?.$el;
  if (!(div instanceof HTMLDivElement)) {
    return scale.value;
  }

  const padding = 16 * 2 + 16 * 0.6;
  const targetWidth = window.innerWidth / 2 - padding;
  const currentWidth = div.getBoundingClientRect().width;
  const targetScale = (targetWidth * scale.value) / currentWidth;

  return Number(targetScale.toFixed(2));
};

const enableEditMode = () => {
  preEditMode.value.showSidebar = store.showSidebar;
  preEditMode.value.panelWidth = panelWidth.value;
  preEditMode.value.scale = scale.value;

  panelWidth.value = Math.max(window.innerWidth / 2, panelWidth.value);
  store.showSidebar = false;
  scale.value = getEditModeScale();
  view.value?.focus();
};

const disableEditMode = () => {
  store.showSidebar = preEditMode.value.showSidebar;
  panelWidth.value = preEditMode.value.panelWidth;
  scale.value = preEditMode.value.scale;
};

const toggleEditMode = () => {
  if (!doc.value?.isCustom) {
    return;
  }

  const msg = t`Please set a Display Doc`;
  if (!displayDoc.value) {
    return showToast({ type: 'warning', message: msg, duration: 'short' });
  }

  editMode.value = !editMode.value;

  if (editMode.value) {
    return enableEditMode();
  }

  disableEditMode();
};

const savePDF = (shouldPrint?: boolean) => {
  if (!printContainer.value?.savePDF) {
    return;
  }

  printContainer.value.savePDF(doc.value?.name, shouldPrint);
};

const setDisplayDoc = async (value: string) => {
  if (!value) {
    hints.value = undefined;
    values.value = null;
    displayDoc.value = null;
    return;
  }

  const schemaName = doc.value?.type;
  if (!schemaName) {
    return;
  }

  const dispDoc = await getDocFromNameIfExistsElseNew(schemaName, value);
  hints.value = getPrintTemplatePropHints(schemaName, fyo);
  values.value = await getPrintTemplatePropValues(dispDoc);
  displayDoc.value = dispDoc;
};

const setDisplayInitialDoc = async () => {
  const schemaName = doc.value?.type;
  if (!schemaName || displayDoc.value?.schemaName === schemaName) {
    return;
  }

  const names = (await fyo.db.getAll(schemaName, {
    limit: 1,
    order: 'desc',
    orderBy: 'created',
    filters: { cancelled: false },
  })) as { name: string }[];

  const valName = names[0]?.name;
  if (!valName) {
    const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
    await showDialog({
      title: t`No Display Entries Found`,
      detail: t`Please create a ${label} entry to view Template Preview.`,
      type: 'warning',
    });

    return;
  }

  await setDisplayDoc(valName);
};

const setDoc = async () => {
  if (doc.value) {
    return;
  }

  doc.value = await getDocFromNameIfExistsElseNew(
    ModelNameEnum.PrintTemplate,
    props.name
  );
};

const setType = async (value: unknown) => {
  if (typeof value !== 'string') {
    return;
  }

  await doc.value?.set('type', value);
  await setDisplayInitialDoc();
};

const selectFile = async () => {
  const { name: fileName, text } = await selectTextFile([
    { name: 'Template', extensions: ['template.html', 'html'] },
  ]);

  if (!text) {
    return;
  }

  await doc.value?.set('template', text);
  view.value?.dispatch({
    changes: { from: 0, to: view.value.state.doc.length, insert: text },
  });

  if (doc.value?.inserted) {
    return;
  }

  let nameVal: string | null = null;
  if (fileName.endsWith('.template.html')) {
    nameVal = fileName.split('.template.html')[0];
  }

  if (!nameVal && fileName.endsWith('.html')) {
    nameVal = fileName.split('.html')[0];
  }

  if (!nameVal) {
    return;
  }

  await doc.value?.set('name', nameVal);
};

const saveFile = async () => {
  const nameVal = doc.value?.name;
  const templateVal = getTemplateEditorState();

  if (!nameVal) {
    return showToast({
      type: 'warning',
      message: t`Print Template Name not set`,
    });
  }

  if (!templateVal) {
    return showToast({
      type: 'warning',
      message: t`Print Template is empty`,
    });
  }

  const { canceled, filePath } = await getSavePath(nameVal, 'template.html');
  if (canceled || !filePath) {
    return;
  }

  await saveExportData(templateVal, filePath, t`Template file saved`);
};

const sync = async () => {
  const activeDoc = doc.value;
  if (!activeDoc) {
    return;
  }

  try {
    await activeDoc.sync();
  } catch (errorVal) {
    await handleErrorWithDialog(errorVal, activeDoc as any);
  }
};

const initialize = async () => {
  await setDoc();
  if (doc.value?.type) {
    hints.value = getPrintTemplatePropHints(doc.value.type, fyo);
  }

  focusOrSelectFormControl(doc.value as any, nameField.value, false);

  if (!doc.value?.template) {
    await doc.value?.set('template', baseTemplate);
  }

  await setDisplayInitialDoc();
};

const reset = () => {
  doc.value = null;
  displayDoc.value = null;
};

const actions = computed(() => {
  if (!doc.value) {
    return [];
  }

  const acts = getActionsForDoc(doc.value as any);
  acts.push({
    label: t`Print Settings`,
    group: t`View`,
    action: async () => {
      await openSettings(ModelNameEnum.PrintSettings);
    },
  });

  if (doc.value.isCustom && !showTypeModal.value) {
    acts.push({
      label: t`Set Template Type`,
      group: t`Action`,
      action: () => (showTypeModal.value = true),
    });
  }

  if (doc.value.isCustom && !showSizeModal.value) {
    acts.push({
      label: t`Set Print Size`,
      group: t`Action`,
      action: () => (showSizeModal.value = true),
    });
  }

  if (doc.value.isCustom) {
    acts.push({
      label: t`Select Template File`,
      group: t`Action`,
      action: selectFile,
    });
  }

  acts.push({
    label: t`Save Template File`,
    group: t`Action`,
    action: saveFile,
  });

  return acts;
});

const setShortcuts = () => {
  if (!shortcuts) {
    return;
  }

  shortcuts.ctrl.set(context, ['Enter'], () => setTemplate());
  shortcuts.ctrl.set(context, ['KeyE'], () => toggleEditMode());
  shortcuts.ctrl.set(context, ['KeyH'], () => toggleShowHints());
  shortcuts.ctrl.set(context, ['Equal'], () => setScale(scale.value + 0.1));
  shortcuts.ctrl.set(context, ['Minus'], () => setScale(scale.value - 0.1));
};

// Lifecycles
onMounted(async () => {
  await initialize();
  if (store.isDevelopment) {
    // @ts-ignore
    window.tb = {
      doc,
      context,
      editMode,
      showHints,
      hints,
      values,
      displayDoc,
      scale,
      panelWidth,
      templateChanged,
      showTypeModal,
      showSizeModal,
      preEditMode,
      initialize,
      reset,
      setTemplate,
      setScale,
      toggleShowHints,
      toggleEditMode,
      enableEditMode,
      disableEditMode,
      savePDF,
      setDisplayDoc,
      setDisplayInitialDoc,
      setDoc,
      setType,
      selectFile,
      saveFile,
      sync,
      actions,
    };
  }
});

onActivated(async () => {
  await initialize();
  store.docsPath = docsPathMap.PrintTemplate ?? '';
  setShortcuts();
});

onDeactivated(() => {
  store.docsPath = '';
  if (editMode.value) {
    disableEditMode();
  }

  if (doc.value?.dirty) {
    return;
  }
  reset();
});
</script>

<style scoped>
.hints-enter-from,
.hints-leave-to {
  opacity: 0;
  height: 0px;
}
.hints-enter-to,
.hints-leave-from {
  opacity: 1;
  height: 30vh;
}

.hints-enter-active,
.hints-leave-active {
  transition: all 150ms ease-out;
}
</style>
