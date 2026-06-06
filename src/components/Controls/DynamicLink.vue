<template>
  <Link ref="linkRef" v-bind="props" :get-suggestions="getLinkSuggestions" />
</template>

<script setup lang="ts">
import { ref, inject, computed, watch } from "vue";
import { fyo } from "src/initFyo";
import { fuzzyMatch } from "src/utils";
import Link from "./Link.vue";
import { BaseControlProps } from "src/composables/useBaseControl";

interface DynamicLinkProps extends BaseControlProps {
  target?: string;
  focusInput?: boolean;
  showClearButton?: boolean;
}

const props = withDefaults(defineProps<DynamicLinkProps>(), {
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

const linkRef = ref<any>(null);
const report = inject<any>("report", null);
const results = ref<any[]>([]);

const doc = computed(() => linkRef.value?.doc);

watch(
  () => doc.value?.[(props.df as any).references as string],
  (newTarget, oldTarget) => {
    if (oldTarget && newTarget !== oldTarget) {
      linkRef.value?.clearValue();
    }
  },
);

const getTargetSchemaName = () => {
  const references = (props.df as any).references;
  if (!references) {
    return null;
  }

  let schemaName = doc.value?.[references];
  if (!schemaName) {
    schemaName = report?.[references];
  }

  if (!schemaName) {
    return null;
  }

  if (!fyo.schemaMap[schemaName]) {
    return null;
  }

  return schemaName as string;
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

  const fields = [
    ...new Set(["name", schema.titleField, (props.df as any).groupBy]),
  ].filter(Boolean) as string[];

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

const getFilters = async () => {
  if (props.df.filters) {
    return props.df.filters;
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

const getLinkSuggestions = async (keyword = "") => {
  const filters = await getFilters();
  let optionsList = await getOptions(filters || {});

  if (keyword) {
    optionsList = optionsList
      .map((item) => ({ ...fuzzyMatch(keyword, item.label), item }))
      .filter(({ isMatch }) => isMatch)
      .sort((a, b) => a.distance - b.distance)
      .map(({ item }) => item);
  }

  return optionsList;
};

const focus = () => {
  linkRef.value?.focus();
};

defineExpose({
  focus,
});
</script>
