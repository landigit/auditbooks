import { ref, computed } from 'vue';
import { Field, FieldTypeEnum } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { getRandomString } from 'utils';
import { QueryFilter } from 'utils/db/types';
import { useApp } from 'src/composables/useApp';

const { t } = useApp();

export const conditions = [
  { label: t`Is`, value: '=' },
  { label: t`Is Not`, value: '!=' },
  { label: t`Contains`, value: 'like' },
  { label: t`Does Not Contain`, value: 'not like' },
  { label: t`Greater Than`, value: '>' },
  { label: t`Less Than`, value: '<' },
  { label: t`Is Empty`, value: 'is null' },
  { label: t`Is Not Empty`, value: 'is not null' },
] as const;

export type Condition = (typeof conditions)[number]['label'];

export type Filter = {
  fieldname: string;
  condition: Condition;
  value: QueryFilter[string];
  implicit: boolean;
};

export function useFilterDropdown(
  props: { schemaName: string },
  emit: (event: 'change', ...args: any[]) => void
) {
  const filters = ref<Filter[]>([]);
  const newFilters = ref<Filter[]>([]);

  const fields = computed<Field[]>(() => {
    const excludedFieldsTypes: string[] = [
      FieldTypeEnum.Table,
      FieldTypeEnum.Attachment,
      FieldTypeEnum.AttachImage,
    ];

    const listViewSettings =
      fyo.models[props.schemaName]?.getListViewSettings?.(fyo);
    const statusField = listViewSettings?.columns?.[1] as any;

    const fieldsList = fyo.schemaMap[props.schemaName]?.fields ?? [];
    const filteredFields = fieldsList.filter((f) => {
      if (f.filter) {
        return true;
      }

      if (excludedFieldsTypes.includes(f.fieldtype)) {
        return false;
      }

      if (f.computed || f.meta || f.readOnly) {
        return false;
      }

      return true;
    });

    if (statusField && statusField.fieldname) {
      const statusFieldExists = filteredFields.some(
        (field) => field.fieldname === statusField.fieldname
      );

      if (!statusFieldExists) {
        const originalStatusField = fieldsList.find(
          (field) => field.fieldname === statusField.fieldname
        );
        if (originalStatusField) {
          filteredFields.unshift(originalStatusField);
        } else {
          filteredFields.unshift(statusField);
        }
      }
    }

    return filteredFields;
  });

  const fieldOptions = computed(() => {
    return fields.value.map((df) => ({
      label: df.fieldname,
      value: df.fieldname,
    }));
  });

  const conditionsForDropdown = computed(() => {
    return conditions.map((c) => ({
      label: c.label,
      value: c.label,
    }));
  });

  const explicitFilters = computed<Filter[]>(() => {
    return filters.value.filter((f) => !f.implicit);
  });

  const activeFilterCount = computed<number>(() => {
    return explicitFilters.value.filter((filter) => filter.value).length;
  });

  const filterAppliedMessage = computed<string>(() => {
    if (activeFilterCount.value === 1) {
      return t`1 filter applied`;
    }
    return t`${activeFilterCount.value} filters applied`;
  });

  function getConditionLabel(value: string): string {
    const condition = conditions.find((c) => c.value === value);
    return condition ? condition.label : value;
  }

  function getConditionValue(label: string): string {
    const condition = conditions.find((c) => c.label === label);
    return condition ? condition.value : label;
  }

  function addNewFilter(): void {
    const df = fields.value[0];
    if (!df) {
      return;
    }
    addFilter(df.fieldname, 'like', '', false);
  }

  function addFilter(
    fieldname: string,
    condition: string,
    value: Filter['value'],
    implicit?: boolean
  ): void {
    const displayCondition = getConditionLabel(condition);
    const newFilter = {
      fieldname,
      condition: displayCondition,
      value,
      implicit: !!implicit,
    };
    filters.value.push(newFilter);
    newFilters.value.push(newFilter);
  }

  function applyFilters() {
    emitFilterChange();
  }

  function removeFilter(index: number): void {
    filters.value.splice(index, 1);
    newFilters.value.splice(index, 1);
  }

  function clearAllFilters(): void {
    filters.value = [];
    newFilters.value = [];
    emit('change', {});
  }

  function updateNewFilters<K extends keyof Filter>(
    index: number,
    key: K,
    value: Filter[K]
  ) {
    if (key === 'condition') {
      const displayCondition = getConditionLabel(value as string);
      newFilters.value[index][key] = displayCondition as Filter[K];
      filters.value[index][key] = displayCondition as Filter[K];
    } else {
      newFilters.value[index][key] = value;
      filters.value[index][key] = value;
    }
  }

  function setFilter(qFilters: QueryFilter, implicit?: boolean): void {
    filters.value = [];
    newFilters.value = [];

    Object.keys(qFilters).map((fieldname) => {
      let parts = qFilters[fieldname];
      let condition: string;
      let value: Filter['value'];

      if (Array.isArray(parts)) {
        condition = parts[0] as string;
        value = parts[1] as Filter['value'];
      } else {
        condition = '=';
        value = parts;
      }

      addFilter(fieldname, condition, value, implicit);
    });

    emitFilterChange();
  }

  function emitFilterChange(): void {
    const qFilters: Record<string, [string, Filter['value']]> = {};

    for (const { condition, value, fieldname } of newFilters.value) {
      if (value === '' || value === null || value === undefined) {
        continue;
      }

      const sqlCondition = getConditionValue(condition);

      if (fieldname === 'numberSeries') {
        qFilters['name'] = [sqlCondition, value];
      } else {
        qFilters[fieldname] = [sqlCondition, value];
      }
    }

    emit('change', qFilters);
    filters.value = [...newFilters.value];

    if (newFilters.value.length) {
      filters.value = filters.value.filter(
        (filter) => filter.condition && filter.value && filter.fieldname
      );
      filters.value.push(newFilters.value[newFilters.value.length - 1]);
    }

    filters.value = Array.from(
      new Map(
        filters.value.map((filter) => [
          `${filter.condition}-${filter.value}-${filter.fieldname}`,
          filter,
        ])
      ).values()
    );
  }

  return {
    filters,
    newFilters,
    fields,
    fieldOptions,
    conditionsForDropdown,
    explicitFilters,
    activeFilterCount,
    filterAppliedMessage,
    getRandomString,
    getConditionLabel,
    getConditionValue,
    addNewFilter,
    addFilter,
    applyFilters,
    removeFilter,
    clearAllFilters,
    updateNewFilters,
    setFilter,
    emitFilterChange,
  };
}
