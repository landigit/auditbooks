<template>
  <AutoComplete
    ref="autoCompleteRef"
    v-bind="props"
    :get-suggestions="getSuggestions"
    :link-value-override="linkValue"
    :custom-clear="clearValue"
    @focus="(e: FocusEvent) => emit('focus', e)"
    @input="(e: Event) => emit('input', e)"
    @change="(val: any) => emit('change', val)"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { t } from 'fyo';
import Badge from 'src/components/Badge.vue';
import { fyo } from 'src/initFyo';
import { fuzzyMatch } from 'src/utils';
import { getCreateFiltersFromListViewFilters } from 'src/utils/misc';
import { markRaw } from 'vue';
import AutoComplete from './AutoComplete.vue';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';

interface MultiLabelLinkProps extends BaseControlProps {
  thirdLink?: string;
  showSecondaryLink?: boolean;
  secondaryLink?: string;
  showClearButton?: boolean;
}

const props = withDefaults(defineProps<MultiLabelLinkProps>(), {
  showSecondaryLink: false,
  showClearButton: false,
  step: 1,
  border: false,
  size: 'large',
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
});

const emit = defineEmits<{
  (e: 'focus', ev: FocusEvent): void;
  (e: 'input', ev: Event): void;
  (e: 'change', val: any): void;
}>();

const autoCompleteRef = ref<any>(null);
const linkValue = ref('');
const results = ref<any[]>([]);

const { doc } = useBaseControl(props, emit, ref(null));

const setLinkValue = async (newValue?: any, isInput?: boolean) => {
  if (isInput) {
    linkValue.value = newValue || '';
    return;
  }

  const value = newValue !== undefined ? newValue : props.value;
  const df = props.df as any;
  const { fieldname, target } = df ?? {};
  const linkDisplayField = fyo.schemaMap[target ?? '']?.linkDisplayField;

  if (!linkDisplayField) {
    linkValue.value = (value as string) || '';
    return;
  }

  const linkDoc = await doc.value?.loadAndGetLink(fieldname);
  linkValue.value = (linkDoc?.get(linkDisplayField) as string) ?? '';
};

watch(
  () => props.value,
  (newValue) => {
    setLinkValue(newValue);
  },
  { immediate: true }
);

onMounted(() => {
  if (props.value) {
    setLinkValue();
  }
});

const getTargetSchemaName = () => {
  return (props.df as any).target;
};

const getOptions = async () => {
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
  const filters = await getFilters();

  const fields = [
    ...new Set([
      'name',
      props.secondaryLink,
      schema.titleField,
      (props.df as any).groupBy,
    ]),
  ].filter(Boolean) as string[];

  const dbResults = await fyo.db.getAll(schemaName, {
    filters,
    fields,
  });

  results.value = dbResults
    .map((r: any) => {
      const option: any = {
        label:
          r[props.secondaryLink as string] && props.showSecondaryLink
            ? `${r[schema.titleField as string]}  ` +
              `  ${r[props.secondaryLink as string]}`
            : r[schema.titleField as string],
        value: r.name,
        value2: r[props.secondaryLink as string],
      };

      if ((props.df as any).groupBy) {
        option.group = r[(props.df as any).groupBy];
      }
      return option;
    })
    .filter(Boolean);

  return results.value;
};

const getSuggestions = async (keyword = '') => {
  let options = await getOptions();

  if (keyword) {
    options = options
      .map((item) => ({ ...fuzzyMatch(keyword, item.label), item }))
      .filter(({ isMatch }) => isMatch)
      .sort((a, b) => a.distance - b.distance)
      .map(({ item }) => item);
  }

  if (doc.value && (props.df as any).create) {
    options = options.concat(getCreateNewOption());
  }

  if (options.length === 0 && !(props.df as any).emptyMessage) {
    return [
      {
        component: markRaw({
          template:
            '<span class="text-description">{{ t`No results found` }}</span>',
          setup() {
            return { t };
          },
        }),
        action: () => {},
        actionOnly: true,
      },
    ];
  }

  return options;
};

const getCreateNewOption = () => {
  return {
    label: t`Create`,
    action: () => openNewDoc(),
    actionOnly: true,
    component: markRaw({
      template:
        '<div class="flex items-center font-semibold">{{ t`Create` }}' +
        '<Badge color="blue" class="ms-2" v-if="isNewValue">{{ linkValue }}</Badge>' +
        '</div>',
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

const openNewDoc = async () => {
  const schemaName = (props.df as any).target;
  const schema = fyo.schemaMap[schemaName];
  if (!schema) {
    return;
  }
  const name = linkValue.value || fyo.doc.getTemporaryName(schema);
  const filters = await getCreateFilters();
  const { openQuickEdit } = await import('src/utils/ui');

  const newDoc = fyo.doc.getNewDoc(schemaName, { name, ...filters });
  openQuickEdit({ doc: newDoc });

  newDoc.once('afterSync', () => {
    window.history.back();
    results.value = [];
    emit('change', newDoc.name);
  });
};

const getCreateFilters = async () => {
  const { schemaName, fieldname } = props.df as any;

  const getCreateFiltersFunc =
    fyo.models[schemaName]?.createFilters?.[fieldname];
  let createFilters = doc.value
    ? await getCreateFiltersFunc?.(doc.value)
    : undefined;

  if (createFilters !== undefined) {
    return createFilters;
  }

  const filters = await getFilters();
  return getCreateFiltersFromListViewFilters(filters);
};

const getFilters = async () => {
  const { schemaName, fieldname } = props.df as any;
  const getFiltersFunc = fyo.models[schemaName]?.filters?.[fieldname];

  if (getFiltersFunc === undefined) {
    return {};
  }

  if (doc.value) {
    return (await getFiltersFunc(doc.value)) ?? {};
  }

  try {
    return (await (getFiltersFunc as any)()) ?? {};
  } catch {
    return {};
  }
};

const clearValue = () => {
  emit('change', '');
  linkValue.value = '';
};

const focus = () => {
  autoCompleteRef.value?.focus();
};

defineExpose({
  focus,
});
</script>
