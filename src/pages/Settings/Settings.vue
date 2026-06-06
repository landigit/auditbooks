<template>
  <view v-if="!isLynx" class="h-full flex flex-col">
    <FormContainer>
      <template #header>
        <Button v-if="canSave" type="primary" @tap="sync">
          {{ t`Save` }}
        </Button>
      </template>
      <template #body>
        <FormHeader
          :form-title="tabLabels[activeTab] ?? ''"
          :form-sub-title="t`Settings`"
          class="sticky top-0 bg-surface border-b border-border"
        >
        </FormHeader>

        <!-- Section Container -->
        <view
          v-if="doc"
          class="flex-1 overflow-auto custom-scroll custom-scroll-thumb1"
        >
          <CommonFormSection
            v-for="([name, fields], idx) in activeGroup.entries()"
            :key="name + idx"
            ref="section"
            class="p-4"
            :class="
              idx !== 0 && activeGroup.size > 1 ? 'border-t border-border' : ''
            "
            :show-title="activeGroup.size > 1 && name !== t`Default`"
            :title="name"
            :fields="fields"
            :doc="doc"
            :errors="errors"
            @value-change="onValueChange"
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
            @tap="activeTab = key as ModelNameEnum"
          >
            {{ tabLabels[key] }}
          </view>
        </view>
      </template>
    </FormContainer>
  </view>
  <view v-else class="MainView">
    <!-- Native Header -->
    <PageHeader :title="tabLabels[activeTab] ?? t`Settings`">
      <view
        v-if="canSave"
        class="px-3 py-1.5 rounded-lg bg-blue-600 cursor-pointer active:opacity-75"
        @tap="sync"
      >
        <text class="text-xs text-white font-semibold">{{ t`Save` }}</text>
      </view>
    </PageHeader>

    <!-- Section Container (Scrollable) -->
    <scroll-view v-if="doc" scroll-y="true" class="DeskContent px-4 py-3">
      <CommonFormSection
        v-for="([name, fields], idx) in activeGroup.entries()"
        :key="name + idx"
        ref="section"
        class="mb-4"
        :class="
          idx !== 0 && activeGroup.size > 1 ? 'border-t border-border pt-4' : ''
        "
        :show-title="activeGroup.size > 1 && name !== t`Default`"
        :title="name"
        :fields="fields"
        :doc="doc"
        :errors="errors"
        @value-change="onValueChange"
      />
    </scroll-view>

    <!-- Tab Bar -->
    <view
      v-if="groupedFields && groupedFields.size > 1"
      class="flex-row justify-around border-t border-border bg-surface py-2"
      style="flex-shrink: 0"
    >
      <view
        v-for="key of groupedFields.keys()"
        :key="key"
        class="flex-1 items-center py-2 px-1"
        @tap="activeTab = key as ModelNameEnum"
      >
        <view
          class="py-1 px-2 rounded-lg items-center"
          :class="key === activeTab ? 'bg-blue-600' : ''"
        >
          <text
            class="text-xs font-semibold text-center"
            :class="key === activeTab ? 'text-white' : 'text-description'"
          >
            {{ tabLabels[key] }}
          </text>
        </view>
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
  onMounted,
  onActivated,
  onDeactivated,
} from "vue";
import { useRoute } from "vue-router";
import { isLynx } from "src/utils/interactive";
import { DocValue } from "fyo/core/types";
import { Doc } from "fyo/model/doc";
import { ValidationError } from "fyo/utils/errors";
import { ModelNameEnum } from "models/types";
import { Field, Schema } from "schemas/types";
import Button from "src/components/Button.vue";
import FormContainer from "src/components/FormContainer.vue";
import FormHeader from "src/components/FormHeader.vue";
import { handleErrorWithDialog } from "src/errorHandling";
import { getErrorMessage } from "src/utils";
import { evaluateHidden } from "src/utils/doc";
import { shortcutsKey } from "src/utils/injectionKeys";
import { showDialog } from "src/utils/interactive";
import { docsPathMap } from "src/utils/misc";
import { UIGroupedFields } from "src/utils/types";
import { useAppStore } from "src/stores/app";
import PageHeader from "src/components/PageHeader.vue";
import CommonFormSection from "../CommonForm/CommonFormSection.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";

const COMPONENT_NAME = "Settings";

// Inject Dependencies
const shortcuts = inject(shortcutsKey);
const store = useAppStore();
const route = typeof useRoute !== "undefined" ? useRoute() : null;

// Reactive State
const errors = ref<Record<string, string>>({});
const activeTab = ref<ModelNameEnum>(ModelNameEnum.AccountingSettings);
const groupedFields = ref<UIGroupedFields | null>(null);

// Computed Properties
const canSave = computed<boolean>(() => {
  return [
    ModelNameEnum.AccountingSettings,
    ModelNameEnum.InventorySettings,
    ModelNameEnum.Defaults,
    ModelNameEnum.POSSettings,
    ModelNameEnum.ERPNextSyncSettings,
    ModelNameEnum.PrintSettings,
    ModelNameEnum.SystemSettings,
  ].some((s) => fyo.singles[s]?.canSave);
});

const doc = computed<Doc | null>(() => {
  const activeDoc = fyo.singles[activeTab.value];
  if (!activeDoc) {
    return null;
  }
  return activeDoc;
});

const tabLabels = computed<Record<string, string>>(() => {
  return {
    [ModelNameEnum.AccountingSettings]: t`General`,
    [ModelNameEnum.PrintSettings]: t`Print`,
    [ModelNameEnum.InventorySettings]: t`Inventory`,
    [ModelNameEnum.Defaults]: t`Defaults`,
    [ModelNameEnum.POSSettings]: t`POS Settings`,
    [ModelNameEnum.ERPNextSyncSettings]: t`ERPNext Sync`,
    [ModelNameEnum.SystemSettings]: t`System`,
  };
});

const schemas = computed<Schema[]>(() => {
  const enableInventory = !!fyo.singles.AccountingSettings?.enableInventory;
  const enablePOS = !!fyo.singles.InventorySettings?.enablePointOfSale;
  const enableERPNextSync = !!fyo.singles.AccountingSettings?.enableERPNextSync;

  return [
    ModelNameEnum.AccountingSettings,
    ModelNameEnum.InventorySettings,
    ModelNameEnum.Defaults,
    ModelNameEnum.POSSettings,
    ModelNameEnum.ERPNextSyncSettings,
    ModelNameEnum.PrintSettings,
    ModelNameEnum.SystemSettings,
  ]
    .filter((s) => {
      if (s === ModelNameEnum.InventorySettings && !enableInventory) {
        return false;
      }

      if (s === ModelNameEnum.POSSettings && !enablePOS) {
        return false;
      }

      if (s === ModelNameEnum.ERPNextSyncSettings && !enableERPNextSync) {
        return false;
      }

      return true;
    })
    .map((s) => fyo.schemaMap[s]!);
});

const activeGroup = computed<Map<string, Field[]>>(() => {
  if (!groupedFields.value) {
    return new Map();
  }

  const group = groupedFields.value.get(activeTab.value);
  if (!group) {
    throw new ValidationError(`Tab group ${activeTab.value} has no value set`);
  }

  return group;
});

// Provide document context to child elements
provide("doc", doc);

// Methods
const updateGroupedFields = () => {
  const grouped: UIGroupedFields = new Map();
  const fields: Field[] = schemas.value.map((s) => s.fields).flat();

  for (const field of fields) {
    const schemaName = field.schemaName! as ModelNameEnum;
    if (!grouped.has(schemaName)) {
      grouped.set(schemaName, new Map());
    }

    const tabbed = grouped.get(schemaName)!;
    const section = field.section ?? t`Miscellaneous`;
    if (!tabbed.has(section)) {
      tabbed.set(section, []);
    }

    if (field.meta) {
      continue;
    }

    const activeDoc = fyo.singles[schemaName];
    if (evaluateHidden(field, activeDoc)) {
      continue;
    }

    tabbed.get(section)!.push(field);
  }

  groupedFields.value = grouped;
};

const update = () => {
  updateGroupedFields();
};

const reset = async () => {
  const resetableDocs = schemas.value
    .map(({ name }) => fyo.singles[name])
    .filter((activeDoc) => activeDoc?.dirty) as Doc[];

  for (const activeDoc of resetableDocs) {
    await activeDoc.load();
  }

  update();
};

const syncDoc = async (activeDoc: Doc) => {
  try {
    await activeDoc.sync();
    updateGroupedFields();
  } catch (error) {
    await handleErrorWithDialog(error, activeDoc);
  }
};

const sync = async () => {
  const syncableDocs = schemas.value
    .map(({ name }) => fyo.singles[name])
    .filter((activeDoc) => activeDoc?.canSave) as Doc[];

  for (const activeDoc of syncableDocs) {
    await syncDoc(activeDoc);
  }

  update();
  await showDialog({
    title: t`Reload Auditbooks?`,
    detail: t`Changes made to settings will be visible on reload.`,
    type: "info",
    buttons: [
      {
        label: t`Yes`,
        isPrimary: true,
        action: ipc.reloadWindow.bind(ipc),
      },
      {
        label: t`No`,
        action: () => null,
        isEscape: true,
      },
    ],
  });
};

const onValueChange = async (field: Field, value: DocValue) => {
  const { fieldname } = field;
  delete errors.value[fieldname];

  try {
    await doc.value?.set(fieldname, value ?? "");
  } catch (err) {
    if (!(err instanceof Error)) {
      return;
    }

    errors.value[fieldname] = getErrorMessage(err, doc.value ?? undefined);
  }

  update();
};

// Lifecycles
onMounted(() => {
  if (store.isDevelopment && typeof window !== "undefined") {
    // @ts-expect-error
    window.settings = {
      errors,
      activeTab,
      groupedFields,
      canSave,
      doc,
      tabLabels,
      schemas,
      activeGroup,
      reset,
      sync,
      onValueChange,
      update,
      updateGroupedFields,
    };
  }

  update();
});

onActivated(() => {
  const tab = route?.query?.tab as string;
  if (tab && tabLabels.value[tab]) {
    activeTab.value = tab as ModelNameEnum;
  }

  store.docsPath = docsPathMap.Settings ?? "";
  shortcuts?.pmod.set(COMPONENT_NAME, ["KeyS"], async () => {
    if (!canSave.value) {
      return;
    }

    await sync();
  });
});

onDeactivated(async () => {
  store.docsPath = "";
  shortcuts?.delete(COMPONENT_NAME);
  if (!canSave.value) {
    return;
  }
  await reset();
});
</script>
