import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue';
import { useRoute } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { ValidationError } from 'fyo/utils/errors';
import { ModelNameEnum } from 'models/types';
import { Field, Schema } from 'schemas/types';
import { handleErrorWithDialog } from 'src/errorHandling';
import { getErrorMessage } from 'src/utils';
import { evaluateHidden } from 'src/utils/doc';
import { showDialog } from 'src/utils/interactive';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { UIGroupedFields } from 'src/utils/types';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useApp } from 'src/composables/useApp';

const COMPONENT_NAME = 'Settings';

export function useSettings() {
  const route = useRoute();
  const { fyo, t } = useApp();
  const shortcuts = useShortcuts();

  const errors = ref<Record<string, string>>({});
  const activeTab = ref(ModelNameEnum.AccountingSettings);
  const groupedFields = ref<null | UIGroupedFields>(null);

  const canSave = computed(() => {
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
    const d = fyo.singles[activeTab.value];
    if (!d) {
      return null;
    }
    return d;
  });

  // Provide to child components
  provide(
    'doc',
    computed(() => doc.value)
  );

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
    const enableERPNextSync =
      !!fyo.singles.AccountingSettings?.enableERPNextSync;

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
      throw new ValidationError(
        `Tab group ${activeTab.value} has no value set`
      );
    }

    return group;
  });

  async function reset() {
    const resetableDocs = schemas.value
      .map(({ name }) => fyo.singles[name])
      .filter((doc) => doc?.dirty) as Doc[];

    for (const d of resetableDocs) {
      await d.load();
    }

    update();
  }

  async function sync(): Promise<void> {
    const syncableDocs = schemas.value
      .map(({ name }) => fyo.singles[name])
      .filter((d) => d?.canSave) as Doc[];

    for (const d of syncableDocs) {
      await syncDoc(d);
    }

    update();
    await showDialog({
      title: t`Reload Auditbooks?`,
      detail: t`Changes made to settings will be visible on reload.`,
      type: 'info',
      buttons: [
        {
          label: t`Yes`,
          isPrimary: true,
          action: () => {
            window.location.href = window.location.origin + '/index.html';
          },
        },
        {
          label: t`No`,
          action: () => null,
          isEscape: true,
        },
      ],
    });
  }

  async function syncDoc(d: Doc): Promise<void> {
    try {
      await d.sync();
      updateGroupedFields();
    } catch (error) {
      await handleErrorWithDialog(error, d);
    }
  }

  async function onValueChange(field: Field, value: DocValue): Promise<void> {
    const { fieldname } = field;
    delete errors.value[fieldname];

    try {
      await doc.value?.set(fieldname, value ?? '');
    } catch (err) {
      if (!(err instanceof Error)) {
        return;
      }
      errors.value[fieldname] = getErrorMessage(err, doc.value ?? undefined);
    }

    update();
  }

  function update() {
    updateGroupedFields();
  }

  function updateGroupedFields() {
    const grouped: UIGroupedFields = new Map();
    const fields: Field[] = schemas.value.map((s) => s.fields).flat();

    for (const field of fields) {
      const schemaName = field.schemaName!;
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

      const d = fyo.singles[schemaName];
      if (evaluateHidden(field, d)) {
        continue;
      }

      tabbed.get(section)!.push(field);
    }

    groupedFields.value = grouped;
  }

  onMounted(() => {
    if (fyo.store.isDevelopment) {
      // @ts-ignore
      window.settings = {
        errors,
        activeTab,
        groupedFields,
        canSave,
        doc,
      };
    }
    update();

    const tab = route.query.tab;
    if (typeof tab === 'string' && tabLabels.value[tab]) {
      activeTab.value = tab;
    }

    docsPathRef.value = docsPathMap.Settings ?? '';
    shortcuts?.pmod.set(COMPONENT_NAME, ['KeyS'], async () => {
      if (!canSave.value) {
        return;
      }
      await sync();
    });
  });

  onUnmounted(async () => {
    docsPathRef.value = '';
    shortcuts?.delete(COMPONENT_NAME);
    if (canSave.value) {
      await reset();
    }
  });

  // Watch route query parameter to update active tab
  watch(
    () => route.query.tab,
    (tab) => {
      if (typeof tab === 'string' && tabLabels.value[tab]) {
        activeTab.value = tab;
      }
    }
  );

  return {
    errors,
    activeTab,
    groupedFields,
    canSave,
    doc,
    tabLabels,
    activeGroup,
    sync,
    onValueChange,
  };
}
