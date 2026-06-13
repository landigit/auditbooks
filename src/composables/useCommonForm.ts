import { ref, computed, watch, onMounted, onUnmounted, provide, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatus } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import { Field, Schema } from 'schemas/types';
import { getErrorMessage } from 'src/utils';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { ActionGroup, DocRef, UIGroupedFields } from 'src/utils/types';
import {
  commonDocSubmit,
  commonDocSync,
  getDocFromNameIfExistsElseNew,
  getFieldsGroupedByTabAndSection,
  getFormRoute,
  getGroupedActionsForDoc,
  isPrintable,
  routeTo,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useBreakpoint } from 'src/composables/useBreakpoint';
import { useApp } from 'src/composables/useApp';

export function useCommonForm(props: { name: string; schemaName: string }) {
  const router = useRouter();
  const { fyo, t } = useApp();
  const shortcuts = useShortcuts();
  const { isMobile } = useBreakpoint();

  const docOrNull = ref<Doc | null>(null) as DocRef;
  const printButtonRef = ref<any>(null);

  const context = useDocShortcuts(shortcuts, docOrNull, 'CommonForm', true);

  const errors = ref<Record<string, string>>({});
  const activeTab = ref(t`Default`);
  const groupedFields = ref<null | UIGroupedFields>(null);
  const isPrintableVal = ref(false);
  const showLinks = ref(false);
  const useFullWidthInternal = ref(false);
  const useFullWidth = computed({
    get: () => isMobile.value || useFullWidthInternal.value,
    set: (val: boolean) => {
      useFullWidthInternal.value = val;
    },
  });
  const row = ref<null | { index: number; fieldname: string }>(null);

  // Provide to child components
  provide('doc', computed(() => docOrNull.value));

  const canShowBarcode = computed(() => {
    if (!fyo.singles.InventorySettings?.enableBarcodes) {
      return false;
    }
    if (!hasDoc.value) {
      return false;
    }
    if (doc.value.isSubmitted || doc.value.isCancelled) {
      return false;
    }
    // @ts-ignore
    return typeof doc.value?.addItem === 'function';
  });

  const canShowExchangeRate = computed(() => {
    return hasDoc.value && !!doc.value.isMultiCurrency;
  });

  const exchangeRate = computed(() => {
    if (!hasDoc.value || typeof doc.value.exchangeRate !== 'number') {
      return 1;
    }
    return doc.value.exchangeRate;
  });

  const fromCurrency = computed(() => {
    const currency = doc.value?.currency;
    if (typeof currency !== 'string') {
      return toCurrency.value;
    }
    return currency;
  });

  const toCurrency = computed(() => {
    const currency = fyo.singles.SystemSettings?.currency;
    if (typeof currency !== 'string') {
      return DEFAULT_CURRENCY;
    }
    return currency;
  });

  const canPrint = computed(() => {
    if (!hasDoc.value) {
      return false;
    }
    return !doc.value.isCancelled && !doc.value.dirty && isPrintableVal.value;
  });

  const canShowLinks = computed(() => {
    if (!hasDoc.value) {
      return false;
    }
    if (doc.value.schema.isSubmittable && !doc.value.isSubmitted) {
      return false;
    }
    return doc.value.inserted;
  });

  const hasDoc = computed(() => {
    return docOrNull.value instanceof Doc;
  });

  const status = computed(() => {
    if (!hasDoc.value) {
      return '';
    }
    return getDocStatus(doc.value);
  });

  const doc = computed<Doc>(() => {
    const d = docOrNull.value;
    if (!d) {
      throw new ValidationError(
        t`Doc ${schema.value.label} ${props.name} not set`
      );
    }
    return d;
  });

  const title = computed(() => {
    if (schema.value.isSubmittable && docOrNull.value?.notInserted) {
      return t`New Entry`;
    }
    return docOrNull.value?.name || t`New Entry`;
  });

  const schema = computed<Schema>(() => {
    const s = fyo.schemaMap[props.schemaName];
    if (!s) {
      throw new ValidationError(`no schema found with ${props.schemaName}`);
    }
    return s;
  });

  const activeGroup = computed<Map<string, Field[]>>(() => {
    if (!groupedFields.value) {
      return new Map();
    }
    const g = groupedFields.value.get(activeTab.value);
    if (!g) {
      const tab = [...groupedFields.value.keys()][0];
      return groupedFields.value.get(tab) ?? new Map<string, Field[]>();
    }
    return g;
  });

  const groupedActions = computed<ActionGroup[]>(() => {
    if (!hasDoc.value) {
      return [];
    }
    return getGroupedActionsForDoc(doc.value);
  });

  async function toggleWidth() {
    const value = !useFullWidth.value;
    await fyo.singles.Misc?.setAndSync('useFullWidth', value);
    useFullWidth.value = value;
  }

  function updateGroupedFields() {
    if (!hasDoc.value) {
      return;
    }
    groupedFields.value = getFieldsGroupedByTabAndSection(
      schema.value,
      doc.value
    );
  }

  async function sync(useDialog?: boolean) {
    if (await commonDocSync(doc.value, useDialog)) {
      updateGroupedFields();
    }
  }

  async function submit() {
    if (await commonDocSubmit(doc.value)) {
      updateGroupedFields();
    }
  }

  async function setDoc() {
    if (docOrNull.value) {
      return;
    }
    docOrNull.value = await getDocFromNameIfExistsElseNew(
      props.schemaName,
      props.name
    );
  }

  function replacePathAfterSync() {
    if (!docOrNull.value || docOrNull.value.inserted) {
      return;
    }
    docOrNull.value.once('afterSync', async () => {
      const route = getFormRoute(props.schemaName, doc.value.name!);
      await router.replace(route);
    });
  }

  async function showRowEditForm(rowDoc: Doc) {
    if (showLinks.value) {
      showLinks.value = false;
      await nextTick();
    }
    const index = rowDoc.idx;
    const fieldname = rowDoc.parentFieldname;
    if (typeof index === 'number' && typeof fieldname === 'string') {
      row.value = { index, fieldname };
    }
  }

  async function onValueChange(field: Field, value: DocValue) {
    const { fieldname } = field;
    delete errors.value[fieldname];
    try {
      await doc.value.set(fieldname, value);
    } catch (err) {
      if (!(err instanceof Error)) {
        return;
      }
      errors.value[fieldname] = getErrorMessage(err, doc.value);
    }
    updateGroupedFields();
  }

  onMounted(async () => {
    useFullWidth.value = !!fyo.singles.Misc?.useFullWidth;
    // @ts-ignore
    window.cf = {
      errors,
      activeTab,
      groupedFields,
      isPrintable: isPrintableVal,
      showLinks,
      useFullWidth,
      row,
      docOrNull,
    };
    await setDoc();
    replacePathAfterSync();
    updateGroupedFields();
    if (groupedFields.value) {
      activeTab.value = [...groupedFields.value.keys()][0];
    }
    isPrintableVal.value = await isPrintable(props.schemaName);

    docsPathRef.value = docsPathMap[props.schemaName] ?? '';
    shortcuts?.pmod.set(context, ['KeyP'], () => {
      if (!canPrint.value) {
        return;
      }
      printButtonRef.value?.$el?.click();
    });
    shortcuts?.pmod.set(context, ['KeyL'], () => {
      if (!canShowLinks.value && !showLinks.value) {
        return;
      }
      showLinks.value = !showLinks.value;
    });
  });

  onUnmounted(() => {
    docsPathRef.value = '';
    showLinks.value = false;
    row.value = null;
    shortcuts?.delete(context);
  });

  // Watch route params to reload document if needed (especially for nested forms or switching records)
  watch(
    () => [props.name, props.schemaName],
    async () => {
      docOrNull.value = null;
      await setDoc();
      replacePathAfterSync();
      updateGroupedFields();
      if (groupedFields.value) {
        activeTab.value = [...groupedFields.value.keys()][0];
      }
      isPrintableVal.value = await isPrintable(props.schemaName);
    }
  );

  return {
    errors,
    activeTab,
    groupedFields,
    isPrintable: isPrintableVal,
    showLinks,
    useFullWidth,
    row,
    docOrNull,
    printButtonRef,
    canShowBarcode,
    canShowExchangeRate,
    exchangeRate,
    fromCurrency,
    toCurrency,
    canPrint,
    canShowLinks,
    hasDoc,
    status,
    doc,
    title,
    schema,
    activeGroup,
    groupedActions,
    toggleWidth,
    updateGroupedFields,
    sync,
    submit,
    showRowEditForm,
    onValueChange,
  };
}
