import { ref, computed, inject, onMounted, onActivated, onDeactivated } from 'vue';
import { EditorView } from 'codemirror';
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import { PrintTemplate } from 'models/baseModels/PrintTemplate';
import { ModelNameEnum } from 'models/types';
import { saveExportData } from 'reports/commonExporter';
import { Field, TargetField } from 'schemas/types';
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
import { docsPathRef, showSidebar } from 'src/utils/refs';
import { DocRef, PrintValues } from 'src/utils/types';
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
import { fyo } from 'src/initFyo';

export function useTemplateBuilder(props: { name: string }) {
  const doc = ref(null) as DocRef<PrintTemplate>;
  const shortcuts = inject(shortcutsKey);

  let context = 'TemplateBuilder';
  if (shortcuts) {
    context = useDocShortcuts(shortcuts, doc, context, false);
  }

  const editMode = ref(false);
  const showHints = ref(false);
  const hints = ref<PrintTemplateHint | undefined>(undefined);
  const values = ref<null | PrintValues>(null);
  const displayDoc = ref<PrintTemplate | null>(null);
  const scale = ref(0.6);
  const panelWidth = ref(22 /** rem */ * 16 /** px */);
  const templateChanged = ref(false);
  const showTypeModal = ref(false);
  const showSizeModal = ref(false);
  const preEditMode = ref({
    scale: 0.6,
    showSidebar: true,
    panelWidth: 22 * 16,
  });

  const templateEditor = ref<any>(null);
  const printContainer = ref<any>(null);
  const nameField = ref<any>(null);

  const view = computed<EditorView | null>(() => {
    const v = templateEditor.value?.view;
    if (v instanceof EditorView) {
      return v;
    }
    return null;
  });

  const canDisplayPreview = computed(() => {
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

  const maxWidth = computed(() => {
    return window.innerWidth - 12 * 16 - 100;
  });

  const actions = computed<Action[]>(() => {
    if (!doc.value) {
      return [];
    }

    const actionsList = getActionsForDoc(doc.value as Doc);
    actionsList.push({
      label: fyo.t`Print Settings`,
      group: fyo.t`View`,
      action: async () => {
        await openSettings(ModelNameEnum.PrintSettings);
      },
    });

    if (doc.value.isCustom && !showTypeModal.value) {
      actionsList.push({
        label: fyo.t`Set Template Type`,
        group: fyo.t`Action`,
        action: () => (showTypeModal.value = true),
      });
    }

    if (doc.value.isCustom && !showSizeModal.value) {
      actionsList.push({
        label: fyo.t`Set Print Size`,
        group: fyo.t`Action`,
        action: () => (showSizeModal.value = true),
      });
    }

    if (doc.value.isCustom) {
      actionsList.push({
        label: fyo.t`Select Template File`,
        group: fyo.t`Action`,
        action: selectFile,
      });
    }

    actionsList.push({
      label: fyo.t`Save Template File`,
      group: fyo.t`Action`,
      action: saveFile,
    });

    return actionsList;
  });

  const fields = computed<Record<string, Field>>(() => {
    return getMapFromList(
      fyo.schemaMap.PrintTemplate?.fields ?? [],
      'fieldname'
    );
  });

  const displayDocField = computed<TargetField>(() => {
    const target = doc.value?.type ?? ModelNameEnum.SalesInvoice;
    return {
      fieldname: 'displayDoc',
      label: fyo.t`Display Doc`,
      fieldtype: 'Link',
      target,
    };
  });

  const helperMessage = computed(() => {
    if (!doc.value) {
      return '';
    }

    if (!doc.value.type) {
      return fyo.t`Select a Template type`;
    }

    if (!displayDoc.value) {
      return fyo.t`Select a Display Doc to view the Template`;
    }

    if (!doc.value.template) {
      return fyo.t`Set a Template value to see the Print Template`;
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
    const platform = fyo.store.platform;
    const isWindows = platform === 'win32';
    styles.height = `calc(100vh - var(--h-row-largest) - 1px - ${
      isWindows ? 'var(--h-row-smallest)' : '0px'
    }`;
    return styles;
  });

  async function initialize() {
    await setDoc();
    if (doc.value?.type) {
      hints.value = getPrintTemplatePropHints(doc.value.type, fyo);
    }

    focusOrSelectFormControl(doc.value as Doc, nameField.value, false);

    if (!doc.value?.template) {
      await doc.value?.set('template', baseTemplate);
    }

    await setDisplayInitialDoc();
  }

  function reset() {
    doc.value = null;
    displayDoc.value = null;
  }

  function getTemplateEditorState() {
    const fallback = doc.value?.template ?? '';
    if (!view.value) {
      return fallback;
    }
    return view.value.state.doc.toString();
  }

  async function setTemplate(value?: string) {
    templateChanged.value = false;
    if (!doc.value?.isCustom) {
      return;
    }

    value ??= getTemplateEditorState();
    await doc.value?.set('template', value);
  }

  function setScale(e: Event | number) {
    let val = scale.value;
    if (typeof e === 'number') {
      val = Number(e.toFixed(2));
    } else if (e instanceof Event && e.target instanceof HTMLInputElement) {
      val = Number(e.target.value);
    }

    scale.value = Math.max(Math.min(val, 10), 0.15);
  }

  function toggleShowHints() {
    showHints.value = !showHints.value;
  }

  function toggleEditMode() {
    if (!doc.value?.isCustom) {
      return;
    }

    if (!displayDoc.value) {
      return showToast({ type: 'warning', message: fyo.t`Please set a Display Doc`, duration: 'short' });
    }

    editMode.value = !editMode.value;

    if (editMode.value) {
      return enableEditMode();
    }

    disableEditMode();
  }

  function enableEditMode() {
    preEditMode.value.showSidebar = showSidebar.value;
    preEditMode.value.panelWidth = panelWidth.value;
    preEditMode.value.scale = scale.value;

    panelWidth.value = Math.max(window.innerWidth / 2, panelWidth.value);
    showSidebar.value = false;
    scale.value = getEditModeScale();
    view.value?.focus();
  }

  function disableEditMode() {
    showSidebar.value = preEditMode.value.showSidebar;
    panelWidth.value = preEditMode.value.panelWidth;
    scale.value = preEditMode.value.scale;
  }

  function getEditModeScale(): number {
    const div = printContainer.value?.$el;
    if (!(div instanceof HTMLDivElement)) {
      return scale.value;
    }

    const padding = 16 * 2 /** p-4 */ + 16 * 0.6; /** w-scrollbar */
    const targetWidth = window.innerWidth / 2 - padding;
    const currentWidth = div.getBoundingClientRect().width;
    const targetScale = (targetWidth * scale.value) / currentWidth;

    return Number(targetScale.toFixed(2));
  }

  function savePDF(shouldPrint?: boolean) {
    const pc = printContainer.value;
    if (!pc?.savePDF) {
      return;
    }
    pc.savePDF(doc.value?.name, shouldPrint);
  }

  async function setDisplayInitialDoc() {
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

    const nameVal = names[0]?.name;
    if (!nameVal) {
      const label = fyo.schemaMap[schemaName]?.label ?? schemaName;
      await showDialog({
        title: fyo.t`No Display Entries Found`,
        detail: fyo.t`Please create a ${label} entry to view Template Preview.`,
        type: 'warning',
      });
      return;
    }

    await setDisplayDoc(nameVal);
  }

  async function sync() {
    const d = doc.value;
    if (!d) {
      return;
    }

    try {
      await d.sync();
    } catch (error) {
      await handleErrorWithDialog(error, d as Doc);
    }
  }

  async function setDoc() {
    if (doc.value) {
      return;
    }

    doc.value = (await getDocFromNameIfExistsElseNew(
      ModelNameEnum.PrintTemplate,
      props.name
    )) as PrintTemplate;
  }

  async function setType(value: unknown) {
    if (typeof value !== 'string') {
      return;
    }

    await doc.value?.set('type', value);
    await setDisplayInitialDoc();
  }

  async function setDisplayDoc(value: string) {
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

    const displayDocVal = await getDocFromNameIfExistsElseNew(schemaName, value);
    hints.value = getPrintTemplatePropHints(schemaName, fyo);
    values.value = await getPrintTemplatePropValues(displayDocVal);
    displayDoc.value = displayDocVal;
  }

  async function selectFile() {
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
  }

  async function saveFile() {
    const nameVal = doc.value?.name;
    const template = getTemplateEditorState();

    if (!nameVal) {
      return showToast({
        type: 'warning',
        message: fyo.t`Print Template Name not set`,
      });
    }

    if (!template) {
      return showToast({
        type: 'warning',
        message: fyo.t`Print Template is empty`,
      });
    }

    const { canceled, filePath } = await getSavePath(nameVal, 'template.html');
    if (canceled || !filePath) {
      return;
    }

    await saveExportData(template, filePath, fyo.t`Template file saved`);
  }

  function setShortcuts() {
    if (!shortcuts) {
      return;
    }

    shortcuts.ctrl.set(context, ['Enter'], () => setTemplate());
    shortcuts.ctrl.set(context, ['KeyE'], toggleEditMode);
    shortcuts.ctrl.set(context, ['KeyH'], toggleShowHints);
    shortcuts.ctrl.set(context, ['Equal'], () => setScale(scale.value + 0.1));
    shortcuts.ctrl.set(context, ['Minus'], () => setScale(scale.value - 0.1));
  }

  onActivated(async () => {
    await initialize();
    docsPathRef.value = docsPathMap.PrintTemplate ?? '';
    setShortcuts();
  });

  onDeactivated(() => {
    docsPathRef.value = '';
    if (editMode.value) {
      disableEditMode();
    }

    if (doc.value?.dirty) {
      return;
    }
    reset();
  });

  onMounted(async () => {
    await initialize();
  });

  return {
    doc,
    context,
    shortcuts,
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
    templateEditor,
    printContainer,
    nameField,
    view,
    canDisplayPreview,
    applyChangesShortcut,
    maxWidth,
    actions,
    fields,
    displayDocField,
    helperMessage,
    templateBuilderBodyStyles,
    templateDisplayStyles,
    initialize,
    reset,
    getTemplateEditorState,
    setTemplate,
    setScale,
    toggleShowHints,
    toggleEditMode,
    savePDF,
    setDisplayInitialDoc,
    sync,
    setType,
    setDisplayDoc,
    selectFile,
    saveFile,
  };
}
