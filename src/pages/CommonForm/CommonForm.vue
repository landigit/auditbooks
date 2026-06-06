<template>
  <view v-if="!isLynx">
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
        <text
          v-if="schema.label && !(canShowBarcode || canShowExchangeRate)"
          class="text-xl font-semibold items-center text-description"
        >
          {{ schema.label }}
        </text>
      </template>
      <template v-if="hasDoc" #header>
        <DropdownWithActions :actions="formActions" />
        <Button v-if="doc?.canSave" type="primary" @tap="sync">
          {{ t`Save` }}
        </Button>
        <Button v-else-if="doc?.canSubmit" type="primary" @tap="submit">{{
          t`Submit`
        }}</Button>
      </template>
      <template #body>
        <FormHeader :form-title="title" class="sticky top-0 bg-surface">
          <StatusPill v-if="hasDoc" :doc="doc" />
        </FormHeader>

        <view
          v-if="hasDoc"
          class="overflow-y-auto flex-1 custom-scroll custom-scroll-thumb1 max-h-[calc(100vh-120px)]"
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
        </view>

        <!-- Tab Bar -->
        <view
          v-if="groupedFields && groupedFields.size > 1"
          class="mt-auto px-4 pb-4 flex gap-8 border-t border-border flex-shrink-0 sticky bottom-0 bg-surface"
        >
          <view
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
            @tap="activeTab = key"
          >
            {{ key }}
          </view>
        </view>
      </template>
      <template #quickedit>
        <!-- Backdrop overlay for quick edit / linked entries on mobile -->
        <Transition
          enter-active-class="transition-opacity duration-150 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <view
            v-if="(showLinks && canShowLinks) || row"
            class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
            @tap="closeQuickEdit"
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
  </view>
  <view v-else class="flex-1 flex flex-col h-full bg-canvas">
    <!-- Native Header -->
    <view
      class="px-4 py-4 flex flex-row justify-between items-center bg-surface border-b border-border"
    >
      <view class="flex flex-row items-center gap-2" @tap="router.back()">
        <text class="text-xl font-bold text-blue-600">&lt;</text>
        <text class="text-lg font-semibold text-main truncate max-w-[150px]">{{
          title
        }}</text>
      </view>
      <view class="flex flex-row items-center gap-2">
        <view
          v-if="doc?.canSave"
          class="px-4 py-2 bg-blue-600 rounded-lg"
          @tap="sync(true)"
        >
          <text class="text-white font-semibold text-sm">{{ t`Save` }}</text>
        </view>
        <view
          v-else-if="doc?.canSubmit"
          class="px-4 py-2 bg-green-600 rounded-lg"
          @tap="submit"
        >
          <text class="text-white font-semibold text-sm">{{ t`Submit` }}</text>
        </view>
        <StatusPill v-if="hasDoc" :doc="doc" class="ms-2" />
      </view>
    </view>

    <!-- Scrollable Form Body -->
    <scroll-view v-if="hasDoc" scroll-y="true" class="flex-1 w-full px-4 py-3">
      <CommonFormSection
        v-for="([n, fields], idx) in activeGroup.entries()"
        :key="n + idx"
        ref="section"
        class="mb-4"
        :show-title="activeGroup.size > 1 && n !== t`Default`"
        :title="n"
        :fields="fields"
        :doc="doc"
        :errors="errors"
        @editrow="showRowEditForm"
        @value-change="onValueChange"
        @row-change="updateGroupedFields"
      />
    </scroll-view>

    <!-- Tab Bar for Multi-Tab Documents -->
    <view
      v-if="groupedFields && groupedFields.size > 1"
      class="flex flex-row justify-around border-t border-border bg-surface py-3"
    >
      <view
        v-for="key of groupedFields.keys()"
        :key="key"
        class="px-3 py-1 rounded"
        :class="key === activeTab ? 'bg-blue-50 border border-blue-200' : ''"
        @tap="activeTab = key"
      >
        <text
          class="text-sm font-semibold"
          :class="key === activeTab ? 'text-blue-600' : 'text-description'"
        >
          {{ key }}
        </text>
      </view>
    </view>
  </view>
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
} from "vue";
import { isLynx } from "src/utils/interactive";
import { useRouter } from "vue-router";
import { DocValue } from "fyo/core/types";
import { Doc } from "fyo/model/doc";
import { DEFAULT_CURRENCY } from "fyo/utils/consts";
import { ValidationError } from "fyo/utils/errors";
import { getDocStatus } from "models/helpers";
import { ModelNameEnum } from "models/types";
import { Field, Schema } from "schemas/types";
import Button from "src/components/Button.vue";
import Barcode from "src/components/Controls/Barcode.vue";
import ExchangeRate from "src/components/Controls/ExchangeRate.vue";
import DropdownWithActions from "src/components/DropdownWithActions.vue";
import FormContainer from "src/components/FormContainer.vue";
import FormHeader from "src/components/FormHeader.vue";
import StatusPill from "src/components/StatusPill.vue";
import { getErrorMessage } from "src/utils";
import { shortcutsKey } from "src/utils/injectionKeys";
import { docsPathMap } from "src/utils/misc";
import { DocRef, UIGroupedFields } from "src/utils/types";
import {
  commonDocSubmit,
  commonDocSync,
  getDocFromNameIfExistsElseNew,
  getFieldsGroupedByTabAndSection,
  getFormRoute,
  getActionsForDoc,
  isPrintable as isPrintableFn,
  routeTo,
} from "src/utils/ui";
import { useDocShortcuts } from "src/utils/vueUtils";
import { useAppStore } from "src/stores/app";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import CommonFormSection from "./CommonFormSection.vue";
import LinkedEntries from "./LinkedEntries.vue";
import RowEditForm from "./RowEditForm.vue";

// Define Props
const props = withDefaults(
  defineProps<{
    name?: string;
    schemaName?: ModelNameEnum;
  }>(),
  {
    name: "",
    schemaName: ModelNameEnum.SalesInvoice,
  },
);

// Router & App Store
const router = useRouter();
const store = useAppStore();

// Setup injection dependencies
const shortcuts = inject(shortcutsKey);
const docOrNull = ref(null) as DocRef;
let context = "CommonForm";
if (shortcuts) {
  context = useDocShortcuts(shortcuts, docOrNull, "CommonForm", true);
}

// Provide document context to child elements
provide(
  "doc",
  computed(() => docOrNull.value),
);

// Template Ref

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

  return typeof doc.value?.addItem === "function";
});

const canShowExchangeRate = computed<boolean>(() => {
  return hasDoc.value && !!doc.value.isMultiCurrency;
});

const exchangeRate = computed<number>(() => {
  if (!hasDoc.value || typeof doc.value.exchangeRate !== "number") {
    return 1;
  }

  return doc.value.exchangeRate;
});

const fromCurrency = computed<string>(() => {
  const currency = doc.value?.currency;
  if (typeof currency !== "string") {
    return toCurrency.value;
  }

  return currency;
});

const toCurrency = computed<string>(() => {
  const currency = fyo.singles.SystemSettings?.currency;
  if (typeof currency !== "string") {
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
    return "";
  }

  return getDocStatus(doc.value);
});

const doc = computed<Doc>(() => {
  const d = docOrNull.value;
  if (!d) {
    throw new ValidationError(
      t`Doc ${schema.value.label} ${props.name} not set`,
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

const formActions = computed(() => {
  if (!hasDoc.value) {
    return [];
  }

  const actions: any[] = [];

  // Toggle full width action
  actions.push({
    label: useFullWidth.value ? t`Minimize width` : t`Maximize width`,
    action: toggleWidth,
  });

  // View linked entries action
  if (canShowLinks.value) {
    actions.push({
      label: t`View linked entries`,
      action: () => {
        showLinks.value = true;
      },
    });
  }

  // Open print view action
  if (canPrint.value) {
    actions.push({
      label: t`Open Print View`,
      action: () => {
        routeTo(`/print/${doc.value.schemaName}/${doc.value.name}`);
      },
    });
  }

  // Get raw actions for doc
  const docActions = getActionsForDoc(doc.value);
  actions.push(...docActions);

  return actions;
});

// Methods
const toggleWidth = async () => {
  const value = !useFullWidth.value;
  await fyo.singles.Misc?.setAndSync("useFullWidth", value);
  useFullWidth.value = value;
};

const updateGroupedFields = (): void => {
  if (!hasDoc.value) {
    return;
  }

  groupedFields.value = getFieldsGroupedByTabAndSection(
    schema.value,
    doc.value,
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
    props.name,
  );
};

const replacePathAfterSync = () => {
  if (!hasDoc.value || doc.value.inserted) {
    return;
  }

  doc.value.once("afterSync", async () => {
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

  if (typeof index === "number" && typeof fieldname === "string") {
    row.value = { index, fieldname };
  }
};

const closeQuickEdit = () => {
  showLinks.value = false;
  row.value = null;
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
  if (typeof window !== "undefined" && store.isDevelopment) {
    // @ts-expect-error
    window.cf = {
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
      formActions,
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
  store.docsPath = docsPathMap[props.schemaName] ?? "";
  shortcuts?.pmod.set(context, ["KeyP"], () => {
    if (!canPrint.value || !doc.value) {
      return;
    }

    routeTo(`/print/${doc.value.schemaName}/${doc.value.name}`);
  });
  shortcuts?.pmod.set(context, ["KeyL"], () => {
    if (!canShowLinks.value && !showLinks.value) {
      return;
    }

    showLinks.value = !showLinks.value;
  });
});

onDeactivated(() => {
  store.docsPath = "";
  showLinks.value = false;
  row.value = null;
});
</script>
