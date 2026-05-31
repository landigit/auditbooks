<template>
  <Popover
    ref="filterPopover"
    v-if="fields.length"
    @update:open="(val) => !val && emitFilterChange()"
  >
    <PopoverTrigger as-child>
      <Button :icon="true">
        <span class="flex items-center">
          <LucideIcon name="filter" :size="12" class="text-muted" />
          <span class="ms-1">
            <template v-if="activeFilterCount > 0">
              {{ filterAppliedMessage }}
            </template>
            <template v-else>
              {{ t`Filter` }}
            </template>
          </span>
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      side="bottom"
      align="end"
      class="w-auto p-0 overflow-hidden"
    >
      <div>
        <div class="p-2">
          <template v-if="explicitFilters.length">
            <div class="flex flex-col gap-2">
              <div
                v-for="(filter, i) in explicitFilters"
                :key="filter.fieldname + getRandomString()"
                class="flex items-center justify-between text-base gap-2"
              >
                <div
                  class="cursor-pointer w-4 h-4 flex items-center justify-center text-description hover:text-main rounded-md group"
                >
                  <span class="hidden group-hover:inline-block">
                    <LucideIcon
                      name="x"
                      class="w-4 h-4 cursor-pointer"
                      @click="removeFilter(i)"
                    />
                  </span>
                  <span class="group-hover:hidden">
                    {{ i + 1 }}
                  </span>
                </div>
                <Select
                  :border="true"
                  size="small"
                  class="w-24"
                  :df="{
                    label: t`Field`,
                    placeholder: t`field`,
                    fieldname: 'fieldname',
                    fieldtype: 'Select',
                    options: fieldOptions,
                  }"
                  :value="filter.fieldname"
                  @mousedown.stop
                  @click.stop
                  @change="(value) => updateNewFilters(i, 'fieldname', value)"
                  @keydown.enter="applyFilters"
                />

                <Select
                  :border="true"
                  size="small"
                  class="w-24"
                  :df="{
                    label: t`Condition`,
                    placeholder: t`Condition`,
                    fieldname: 'condition',
                    fieldtype: 'Select',
                    options: conditionsForDropdown,
                  }"
                  :value="filter.condition"
                  :close-drop-down="false"
                  @mousedown.stop
                  @click.stop
                  @change="(value) => updateNewFilters(i, 'condition', value)"
                  @keydown.enter="applyFilters"
                />

                <Data
                  :border="true"
                  size="small"
                  class="w-24"
                  :df="{
                    label: t`Value`,
                    placeholder: t`Value`,
                    fieldname: 'value',
                    fieldtype: 'Data',
                  }"
                  :value="String(filter.value)"
                  :close-drop-down="false"
                  @mousedown.stop
                  @click.stop
                  @change="(value) => updateNewFilters(i, 'value', value)"
                  @keydown.enter="applyFilters"
                />
              </div>
            </div>
          </template>
          <template v-else>
            <span class="text-base text-description">{{
              t`No filters selected`
            }}</span>
          </template>
        </div>
        <div class="flex justify-between border-t border-border">
          <div
            class="text-base border-t border-border p-2 flex items-center text-description cursor-pointer hover:bg-surface-hover"
            @click.stop="addNewFilter"
          >
            <LucideIcon name="plus" class="w-4 h-4" />
            <span class="ms-2">{{ t`Add a filter` }}</span>
          </div>

          <div class="flex">
            <div
              v-if="filters.length"
              class="text-base p-2 flex items-center text-description cursor-pointer hover:bg-surface-hover"
              @click="clearAllFilters"
            >
              <LucideIcon name="trash-2" class="w-4 h-4" />
              <span class="ms-2">{{ t`Clear` }}</span>
            </div>

            <div
              v-if="filters.length"
              @click="applyFilters"
              class="text-base border-t border-border p-2 flex items-center text-description cursor-pointer hover:bg-surface-hover"
            >
              <LucideIcon name="search" class="w-4 h-4" />
              <span class="ml-2 text-sm">{{ t`Apply` }}</span>
            </div>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed } from 'vue';
import { Field, FieldTypeEnum } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { getRandomString } from 'src/utils/core/index.js';
import Button from './Button.vue';
import Data from './Controls/Data.vue';
import Select from './Controls/Select.vue';
import { Popover, PopoverTrigger, PopoverContent } from 'src/components/ui';
import { QueryFilter } from 'src/utils/db/types.js';
import { t } from 'fyo';

// --- Types ---
const conditions = [
  { label: t`Is`, value: '=' },
  { label: t`Is Not`, value: '!=' },
  { label: t`Contains`, value: 'like' },
  { label: t`Does Not Contain`, value: 'not like' },
  { label: t`Greater Than`, value: '>' },
  { label: t`Less Than`, value: '<' },
  { label: t`Is Empty`, value: 'is null' },
  { label: t`Is Not Empty`, value: 'is not null' },
] as const;

type Filter = {
  fieldname: string;
  condition: string;
  value: QueryFilter[string];
  implicit: boolean;
};

// --- Props & Emits ---
const props = defineProps<{
  schemaName: string;
}>();

const emit = defineEmits<{
  (e: 'change', filters: Record<string, any>): void;
}>();

// --- State ---
const filterPopover = ref<any>(null);
const filters = ref<Filter[]>([]);
const newFilters = ref<Filter[]>([]);

// --- Computed ---
const fields = computed<Field[]>(() => {
  const excludedFieldsTypes: string[] = [
    FieldTypeEnum.Table,
    FieldTypeEnum.Attachment,
    FieldTypeEnum.AttachImage,
  ];

  const listViewSettings =
    fyo.models[props.schemaName]?.getListViewSettings?.(fyo);
  const statusField = listViewSettings?.columns?.[1] as any;

  const schemaFields = fyo.schemaMap[props.schemaName]?.fields ?? [];
  const filteredFields = schemaFields.filter((f) => {
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
      const originalStatusField = schemaFields.find(
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

const fieldOptions = computed<{ label: string; value: string }[]>(() => {
  return fields.value.map((df) => ({
    label: df.fieldname,
    value: df.fieldname,
  }));
});

const conditionsForDropdown = computed<{ label: string; value: string }[]>(
  () => {
    return conditions.map((c) => ({
      label: c.label,
      value: c.label,
    }));
  }
);

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

// --- Expose ---
defineExpose({ setFilter });

// --- Methods ---
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

function setFilter(filtersObj: QueryFilter, implicit?: boolean): void {
  filters.value = [];
  newFilters.value = [];

  Object.keys(filtersObj).map((fieldname) => {
    let parts = filtersObj[fieldname];
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
  const activeFiltersObj: Record<string, [string, Filter['value']]> = {};

  for (const { condition, value, fieldname } of newFilters.value) {
    if (value === '' || value === null || value === undefined) {
      continue;
    }

    const sqlCondition = getConditionValue(condition);

    if (fieldname === 'numberSeries') {
      activeFiltersObj['name'] = [sqlCondition, value];
    } else {
      activeFiltersObj[fieldname] = [sqlCondition, value];
    }
  }

  emit('change', activeFiltersObj);
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
</script>
