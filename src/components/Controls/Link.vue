<template>
  <AutoComplete
    ref="autoCompleteRef"
    v-bind="props"
    :get-suggestions="getLinkSuggestions"
    :link-value-override="linkValue"
    :custom-clear="clearValue"
    @focus="(e: FocusEvent) => emit('focus', e)"
    @input="(e: Event) => emit('input', e)"
    @change="(val: any) => emit('change', val)"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from "vue";
import { t } from "fyo";
import { fyo } from "src/initFyo";
import { fuzzyMatch } from "src/utils";
import { getCreateFiltersFromListViewFilters } from "src/utils/misc";
import { markRaw } from "vue";
import Badge from "src/components/Badge.vue";
import AutoComplete from "./AutoComplete.vue";
import { BaseControlProps, useBaseControl } from "src/composables/useBaseControl";

interface LinkProps extends BaseControlProps {
  focusInput?: boolean;
  showClearButton?: boolean;
}

const props = withDefaults(defineProps<LinkProps>(), {
  focusInput: false,
  showClearButton: false,
  step: 1,
  border: false,
  size: "large",
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
});

const emit = defineEmits<{
  (e: "focus", ev: FocusEvent): void;
  (e: "input", ev: Event): void;
  (e: "change", val: any): void;
}>();

const autoCompleteRef = ref<any>(null);
const linkValue = ref("");
const filtersDisabled = ref(false);
const results = ref<any[]>([]);

const { doc } = useBaseControl(props, emit, ref(null));

const setLinkValue = async (newValue?: any, isInput?: boolean) => {
  if (isInput) {
    linkValue.value = newValue || "";
    return;
  }

  const value = newValue !== undefined ? newValue : props.value;
  const df = props.df as any;
  const { fieldname, target } = df ?? {};
  const linkDisplayField = fyo.schemaMap[target ?? ""]?.linkDisplayField;
  if (!linkDisplayField) {
    linkValue.value = (value as string) || "";
    return;
  }

  const linkDoc = await doc.value?.loadAndGetLink(fieldname);
  linkValue.value = (linkDoc?.get(linkDisplayField) as string) ?? "";
};

const focusInputTag = () => {
  nextTick(() => {
    autoCompleteRef.value?.focusInputTag();
  });
};

const clearValue = () => {
  emit("change", "");
  linkValue.value = "";
};

const getTargetSchemaName = () => {
  return (props.df as any).target;
};

const getOptions = async (filters: any) => {
  const schemaName = getTargetSchemaName();
  if (!schemaName) {
    return [];
  }

  if (results.value?.length) {
    return results.value;
  }

  const schema = fyo.schemaMap[schemaName];
  if (!schema) {
    return [];
  }

  const fields = [...new Set(["name", schema.titleField, (props.df as any).groupBy])].filter(
    Boolean,
  ) as string[];

  const dbResults = await fyo.db.getAll(schemaName, {
    filters,
    fields,
  });

  results.value = dbResults
    .map((r: any) => {
      const option: any = {
        label: r[schema.titleField as string],
        value: r.name,
      };
      if ((props.df as any).groupBy) {
        option.group = r[(props.df as any).groupBy];
      }
      return option;
    })
    .filter(Boolean);

  return results.value;
};

const getLinkSuggestions = async (keyword = "") => {
  let filters = filtersDisabled.value ? null : await getFilters();
  let optionsList = await getOptions(filters || {});

  if (keyword) {
    optionsList = optionsList
      .map((item) => ({ ...fuzzyMatch(keyword, item.label), item }))
      .filter(({ isMatch }) => isMatch)
      .sort((a, b) => a.distance - b.distance)
      .map(({ item }) => item);
  }

  if (optionsList.length === 0 && !(props.df as any).emptyMessage) {
    if (filters && !!fyo.singles.SystemSettings?.allowFilterBypass) {
      optionsList = [
        {
          component: markRaw({
            template:
              '<text class="text-description">{{ t`No results found, disable filters` }}</text>',
            setup() {
              return { t };
            },
          }),
          action: () => disableFiltering(keyword),
          actionOnly: true,
        },
      ];
    } else if (autoCompleteRef.value?.isFocused && (!doc.value || !(props.df as any).create)) {
      optionsList = [
        {
          component: markRaw({
            template: '<text class="text-description">{{ t`No results found` }}</text>',
            setup() {
              return { t };
            },
          }),
          action: () => {},
          actionOnly: true,
        },
      ];
    }
  }

  if (doc.value && (props.df as any).create) {
    optionsList = optionsList.concat(getCreateNewOption());
  }

  return optionsList;
};

const getCreateNewOption = () => {
  return {
    label: t`Create`,
    action: () => openNewDoc(),
    actionOnly: true,
    component: markRaw({
      template:
        '<view class="flex items-center font-semibold">{{ t`Create` }}' +
        '<Badge color="blue" class="ms-2" v-if="isNewValue">{{ linkValue }}</Badge>' +
        "</view>",
      setup() {
        const isNewValue = computed(() => {
          const suggestions = autoCompleteRef.value?.suggestions || [];
          const values = suggestions.map((d: any) => d.label);
          return linkValue.value && !values.includes(linkValue.value);
        });
        return { t, linkValue, isNewValue };
      },
      components: { Badge },
    }),
  };
};

const disableFiltering = (keyword: string) => {
  filtersDisabled.value = true;
  results.value = [];
  setTimeout(() => {
    if (autoCompleteRef.value) {
      autoCompleteRef.value.isDropdownOpen = true;
      autoCompleteRef.value.updateSuggestions(keyword);
    }
  }, 1);
};

const openNewDoc = async () => {
  const schemaName = (props.df as any).target;
  const schema = fyo.schemaMap[schemaName];
  if (!schema) {
    return;
  }
  const name = linkValue.value || fyo.doc.getTemporaryName(schema);
  const filters = await getCreateFilters();
  const { openQuickEdit } = await import("src/utils/ui");

  const newDoc = fyo.doc.getNewDoc(schemaName, { name, ...filters });
  openQuickEdit({ doc: newDoc });

  newDoc.once("afterSync", () => {
    window.history.back();
    results.value = [];
    emit("change", newDoc.name);
  });
};

const getCreateFilters = async () => {
  const { schemaName, fieldname } = props.df as any;
  const getCreateFiltersFunc = fyo.models[schemaName]?.createFilters?.[fieldname];
  let createFilters = doc.value ? await getCreateFiltersFunc?.(doc.value) : undefined;

  if (createFilters !== undefined) {
    return createFilters;
  }

  const filters = (await getFilters()) ?? {};
  return getCreateFiltersFromListViewFilters(filters);
};

const getFilters = async () => {
  if ((props.df as any).filters) {
    return (props.df as any).filters;
  }

  if (fyo.singles.SystemSettings?.removeFilter) {
    return null;
  }

  const { schemaName, fieldname } = props.df as any;
  const getFiltersFunc = fyo.models[schemaName]?.filters?.[fieldname];

  if (getFiltersFunc === undefined) {
    return null;
  }

  if (doc.value) {
    return await getFiltersFunc(doc.value);
  }

  try {
    return await (getFiltersFunc as any)();
  } catch {
    return null;
  }
};

const focus = () => {
  autoCompleteRef.value?.focus();
};

watch(
  () => props.value,
  (newValue) => {
    setLinkValue(newValue);
  },
  { immediate: true },
);

onMounted(() => {
  if (props.value) {
    setLinkValue();
  }
  if (props.focusInput) {
    focusInputTag();
  }
});

defineExpose({
  focus,
  clearValue,
  getLinkSuggestions,
  setLinkValue,
  linkValue,
  results,
  doc,
});
</script>
