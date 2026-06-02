<template>
  <FormContainer :use-full-width="useFullWidth">
    <template v-if="hasDoc" #header-left>
      <Barcode
        v-if="canShowBarcode"
        class="h-8"
        @item-selected="
          (name: string) => {
            // @ts-ignore
            doc?.addItem(name);
          }
        "
      />
      <ExchangeRate
        v-if="canShowExchangeRate"
        :disabled="doc?.isSubmitted || doc?.isCancelled"
        :from-currency="fromCurrency"
        :to-currency="toCurrency"
        :exchange-rate="exchangeRate"
        @change="
          async (exchangeRate: number) =>
            await doc.set('exchangeRate', exchangeRate)
        "
      />
      <p
        v-if="schema.label && !(canShowBarcode || canShowExchangeRate)"
        class="text-xl font-semibold items-center text-description"
      >
        {{ schema.label }}
      </p>
    </template>
    <template v-if="hasDoc" #header>
      <Button
        v-if="canShowLinks"
        :icon="true"
        :title="t`View linked entries`"
        @click="showLinks = true"
      >
        <LucideIcon name="link" class="w-4 h-4"></LucideIcon>
      </Button>
      <Button
        v-if="canPrint"
        ref="printButton"
        :icon="true"
        :title="t`Open Print View`"
        @click="routeTo(`/print/${doc.schemaName}/${doc.name}`)"
      >
        <LucideIcon name="printer" class="w-4 h-4"></LucideIcon>
      </Button>
      <Button
        :icon="true"
        :title="t`Toggle between form and full width`"
        @click="toggleWidth"
      >
        <LucideIcon
          :name="useFullWidth ? 'minimize' : 'maximize'"
          class="w-4 h-4"
        ></LucideIcon>
      </Button>
      <DropdownWithActions
        v-for="group of groupedActions"
        :key="group.label"
        :type="group.type"
        :actions="group.actions"
      >
        <p v-if="group.group">
          {{ group.group }}
        </p>
        <LucideIcon v-else name="more-horizontal" class="w-4 h-4" />
      </DropdownWithActions>
      <Button v-if="doc?.canSave" type="primary" @click="sync">
        {{ t`Save` }}
      </Button>
      <Button v-else-if="doc?.canSubmit" type="primary" @click="submit">{{
        t`Submit`
      }}</Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="title"
        class="sticky top-0 bg-surface border-b border-border"
      >
        <StatusPill v-if="hasDoc" :doc="doc" />
      </FormHeader>

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
      >
        <CommonFormSection
          v-for="([n, fields], idx) in activeGroup.entries()"
          :key="n + idx"
          ref="section"
          class="p-4"
          :class="
            idx !== 0 && activeGroup.size > 1 ? 'border-t border-border' : ''
          "
          :show-title="activeGroup.size > 1 && n !== t`Default`"
          :title="n"
          :fields="fields"
          :doc="doc"
          :errors="errors"
          @editrow="(doc: Doc) => showRowEditForm(doc)"
          @value-change="onValueChange"
          @row-change="updateGroupedFields"
        />
      </div>

      <!-- Tab Bar -->
      <div
        v-if="groupedFields && groupedFields.size > 1"
        class="mt-auto px-4 pb-4 flex gap-8 border-t border-border flex-shrink-0 sticky bottom-0 bg-surface"
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="text-sm cursor-pointer"
          :class="
            key === activeTab
              ? 'text-main font-semibold border-t-2 border-main'
              : 'text-description'
          "
          :style="{
            paddingTop: key === activeTab ? 'calc(1rem - 2px)' : '1rem',
          }"
          @click="activeTab = key"
        >
          {{ key }}
        </div>
      </div>
    </template>
    <template #quickedit>
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="translate-x-full opacity-0 w-0"
        enter-to-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
        leave-to-class="translate-x-full opacity-0 w-0"
      >
        <LinkedEntries
          v-if="showLinks && canShowLinks"
          :doc="doc"
          @close="showLinks = false"
        />
      </Transition>
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="translate-x-full opacity-0 w-0"
        enter-to-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
        leave-to-class="translate-x-full opacity-0 w-0"
      >
        <RowEditForm
          v-if="row && !showLinks"
          :doc="doc"
          :fieldname="row.fieldname"
          :index="row.index"
          @previous="(i: number) => (row!.index = i)"
          @next="(i: number) => (row!.index = i)"
          @close="() => (row = null)"
        />
      </Transition>
    </template>
  </FormContainer>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  inject,
  provide,
  onBeforeMount,
  onMounted,
  onActivated,
  onDeactivated,
  nextTick,
} from 'vue';
import { useRouter } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatus } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import { Field, Schema } from 'schemas/types';
import Button from 'src/components/Button.vue';
import Barcode from 'src/components/Controls/Barcode.vue';
import ExchangeRate from 'src/components/Controls/ExchangeRate.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import StatusPill from 'src/components/StatusPill.vue';
import { getErrorMessage } from 'src/utils/api/index.js';
import { shortcutsKey } from 'src/utils/api/injectionKeys.js';
import { docsPathMap } from 'src/utils/api/misc.js';
import { ActionGroup, DocRef, UIGroupedFields } from 'src/utils/api/types.js';
import {
  commonDocSubmit,
  commonDocSync,
  getDocFromNameIfExistsElseNew,
  getFieldsGroupedByTabAndSection,
  getFormRoute,
  getGroupedActionsForDoc,
  isPrintable as isPrintableFn,
  routeTo,
} from 'src/utils/api/ui.js';
import { useDocShortcuts } from 'src/utils/api/vueUtils.js';
import { useAppStore } from 'src/stores/app';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import CommonFormSection from './CommonFormSection.vue';
import LinkedEntries from './LinkedEntries.vue';
import RowEditForm from './RowEditForm.vue';

// Define Props
const props = withDefaults(
  defineProps<{
    name?: string;
    schemaName?: ModelNameEnum;
  }>(),
  {
    name: '',
    schemaName: ModelNameEnum.SalesInvoice,
  }
);

// Router & App Store
const router = useRouter();
const store = useAppStore();

// Setup injection dependencies
const shortcuts = inject(shortcutsKey);
const docOrNull = ref(null) as DocRef;
let context = 'CommonForm';
if (shortcuts) {
  context = useDocShortcuts(shortcuts, docOrNull, 'CommonForm', true);
}

// Provide document context to child elements
provide(
  'doc',
  computed(() => docOrNull.value)
);

// Template Ref
const printButton = ref<InstanceType<typeof Button> | null>(null);

// Reactive State definitions
const errors = ref<Record<string, string>>({});
const activeTab = ref(t`Default`);
const groupedFields = ref<UIGroupedFields | null>(null);
const isPrintable = ref(false);
const showLinks = ref(false);
const useFullWidth = ref(false);
const row = ref<{ index: number; fieldname: string } | null>(null);

// Computed properties
const canShowBarcode = computed<boolean>(() => {
  if (!fyo.singles.InventorySettings?.enableBarcodes) {
    return false;
  }

  if (!hasDoc.value) {
    return false;
  }

  if (doc.value.isSubmitted || doc.value.isCancelled) {
    return false;
  }

  return typeof doc.value?.addItem === 'function';
});

const canShowExchangeRate = computed<boolean>(() => {
  return hasDoc.value && !!doc.value.isMultiCurrency;
});

const exchangeRate = computed<number>(() => {
  if (!hasDoc.value || typeof doc.value.exchangeRate !== 'number') {
    return 1;
  }

  return doc.value.exchangeRate;
});

const fromCurrency = computed<string>(() => {
  const currency = doc.value?.currency;
  if (typeof currency !== 'string') {
    return toCurrency.value;
  }

  return currency;
});

const toCurrency = computed<string>(() => {
  const currency = fyo.singles.SystemSettings?.currency;
  if (typeof currency !== 'string') {
    return DEFAULT_CURRENCY;
  }

  return currency;
});

const canPrint = computed<boolean>(() => {
  if (!hasDoc.value) {
    return false;
  }

  return !doc.value.isCancelled && !doc.value.dirty && isPrintable.value;
});

const canShowLinks = computed<boolean>(() => {
  if (!hasDoc.value) {
    return false;
  }

  if (doc.value.schema.isSubmittable && !doc.value.isSubmitted) {
    return false;
  }

  return doc.value.inserted;
});

const hasDoc = computed<boolean>(() => {
  return docOrNull.value instanceof Doc;
});

const status = computed<string>(() => {
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

const title = computed<string>(() => {
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

  const group = groupedFields.value.get(activeTab.value);
  if (!group) {
    const tab = [...groupedFields.value.keys()][0];
    return groupedFields.value.get(tab) ?? new Map<string, Field[]>();
  }

  return group;
});

const groupedActions = computed<ActionGroup[]>(() => {
  if (!hasDoc.value) {
    return [];
  }

  return getGroupedActionsForDoc(doc.value);
});

// Methods
const toggleWidth = async () => {
  const value = !useFullWidth.value;
  await fyo.singles.Misc?.setAndSync('useFullWidth', value);
  useFullWidth.value = value;
};

const updateGroupedFields = (): void => {
  if (!hasDoc.value) {
    return;
  }

  groupedFields.value = getFieldsGroupedByTabAndSection(
    schema.value,
    doc.value
  );
};

const sync = async (useDialog?: boolean) => {
  if (await commonDocSync(doc.value, useDialog)) {
    updateGroupedFields();
  }
};

const submit = async () => {
  if (await commonDocSubmit(doc.value)) {
    updateGroupedFields();
  }
};

const setDoc = async () => {
  if (hasDoc.value) {
    return;
  }

  docOrNull.value = await getDocFromNameIfExistsElseNew(
    props.schemaName,
    props.name
  );
};

const replacePathAfterSync = () => {
  if (!hasDoc.value || doc.value.inserted) {
    return;
  }

  doc.value.once('afterSync', async () => {
    const route = getFormRoute(props.schemaName, doc.value.name!);
    await router.replace(route);
  });
};

const showRowEditForm = async (childDoc: Doc) => {
  if (showLinks.value) {
    showLinks.value = false;
    await nextTick();
  }

  const index = childDoc.idx;
  const fieldname = childDoc.parentFieldname;

  if (typeof index === 'number' && typeof fieldname === 'string') {
    row.value = { index, fieldname };
  }
};

const onValueChange = async (field: Field, value: DocValue) => {
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
};

// Lifecycles
onBeforeMount(() => {
  useFullWidth.value = !!fyo.singles.Misc?.useFullWidth;
});

onMounted(async () => {
  if (store.isDevelopment) {
    (window as any).cf = {
      errors,
      activeTab,
      groupedFields,
      isPrintable,
      showLinks,
      useFullWidth,
      row,
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
      printButton,
      toggleWidth,
      updateGroupedFields,
      sync,
      submit,
      setDoc,
      replacePathAfterSync,
      showRowEditForm,
      onValueChange,
    };
  }

  await setDoc();
  replacePathAfterSync();
  updateGroupedFields();
  if (groupedFields.value) {
    activeTab.value = [...groupedFields.value.keys()][0];
  }
  isPrintable.value = await isPrintableFn(props.schemaName);
});

onActivated(() => {
  useFullWidth.value = !!fyo.singles.Misc?.useFullWidth;
  store.docsPath = docsPathMap[props.schemaName] ?? '';
  shortcuts?.pmod.set(context, ['KeyP'], () => {
    if (!canPrint.value) {
      return;
    }

    printButton.value?.$el.click();
  });
  shortcuts?.pmod.set(context, ['KeyL'], () => {
    if (!canShowLinks.value && !showLinks.value) {
      return;
    }

    showLinks.value = !showLinks.value;
  });
});

onDeactivated(() => {
  store.docsPath = '';
  showLinks.value = false;
  row.value = null;
});
</script>
