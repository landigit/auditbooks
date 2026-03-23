<template>
  <Popover
    ref="filterPopover"
    v-if="fields.length"
    placement="bottom-end"
    @close="emitFilterChange"
    :close-on-click-outside="true"
    :close-on-click-content="false"
  >
    <template #target="{ togglePopover }">
      <Button :icon="true" @click="togglePopover()">
        <span class="flex items-center">
          <Icon
            name="filter"
            size="12"
            class="stroke-current text-gray-700 dark:text-gray-400"
          />
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
    </template>
    <template #content>
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
                  class="
                    cursor-pointer
                    w-4
                    h-4
                    flex
                    items-center
                    justify-center
                    text-gray-600
                    dark:text-gray-400
                    hover:text-gray-800
                    dark:hover:text-gray-300
                    rounded-md
                    group
                  "
                >
                  <span class="hidden group-hover:inline-block">
                    <feather-icon
                      name="x"
                      class="w-4 h-4 cursor-pointer"
                      :button="true"
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
                  @change="(v: string) => updateNewFilters(i, 'fieldname', v)"
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
                  @change="(v: Condition) => updateNewFilters(i, 'condition', v)"
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
                  @change="(v: string) => updateNewFilters(i, 'value', v)"
                  @keydown.enter="applyFilters"
                />
              </div>
            </div>
          </template>
          <template v-else>
            <span class="text-base text-gray-600 dark:text-gray-500">{{
              t`No filters selected`
            }}</span>
          </template>
        </div>
        <div class="flex justify-between border-t dark:border-gray-800">
          <div
            class="
              text-base
              border-t
              dark:border-gray-800
              p-2
              flex
              items-center
              text-gray-600
              dark:text-gray-500
              cursor-pointer
              hover:bg-gray-100
              dark:hover:bg-gray-875
            "
            @click.stop="addNewFilter"
          >
            <feather-icon name="plus" class="w-4 h-4" />
            <span class="ms-2">{{ t`Add a filter` }}</span>
          </div>

          <div class="flex">
            <div
              v-if="filters.length"
              class="
                text-base
                p-2
                flex
                items-center
                text-gray-600
                dark:text-gray-500
                cursor-pointer
                hover:bg-gray-100
                dark:hover:bg-gray-875
              "
              @click="clearAllFilters"
            >
              <feather-icon name="trash-2" class="w-4 h-4" />
              <span class="ms-2">{{ t`Clear` }}</span>
            </div>

            <div
              v-if="filters.length"
              @click="applyFilters"
              class="
                text-base
                border-t
                dark:border-gray-800
                p-2
                flex
                items-center
                text-gray-600
                dark:text-gray-500
                cursor-pointer
                hover:bg-gray-100
                dark:hover:bg-gray-875
              "
            >
              <feather-icon name="search" class="w-4 h-4" />
              <span class="ml-2 text-sm">{{ t`Apply` }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Popover>
</template>

<script setup lang="ts">
import { t } from 'fyo';
import { type Field, FieldTypeEnum } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { getRandomString } from 'utils';
import type { QueryFilter } from 'utils/db/types';
import { computed, ref } from 'vue';
import Button from './Button.vue';
import Data from './Controls/Data.vue';
import Select from './Controls/Select.vue';
import Icon from './Icon.vue';
import type Popover from './Popover.vue';

const props = defineProps<{
  schemaName: string;
}>();

const emit = defineEmits<(e: 'change', filters: QueryFilter) => void>();

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

type ConditionValue = (typeof conditions)[number]['value'];
type Condition = (typeof conditions)[number]['label'];

type Filter = {
  fieldname: string;
  condition: Condition;
  value: QueryFilter[string];
  implicit: boolean;
};

const filters = ref<Filter[]>([]);
const newFilters = ref<Filter[]>([]);
const filterPopover = ref<InstanceType<typeof Popover> | null>(null);

const fields = computed(() => {
  const excludedFieldsTypes: string[] = [
    FieldTypeEnum.Table,
    FieldTypeEnum.Attachment,
    FieldTypeEnum.AttachImage,
  ];

  const model = fyo.models[props.schemaName];
  // biome-ignore lint/suspicious/noExplicitAny: library interop
  const listViewSettings = (model as any)?.getListViewSettings?.(fyo);
  // biome-ignore lint/suspicious/noExplicitAny: library interop
  const statusField = (listViewSettings as any)?.columns?.[1] as any;

  const schemaFields = fyo.schemaMap[props.schemaName]?.fields ?? [];
  const filteredFields = schemaFields.filter((f) => {
    if (f.filter) return true;
    if (excludedFieldsTypes.includes(f.fieldtype)) return false;
    if (f.computed || f.meta || f.readOnly) return false;
    return true;
  });

  if (statusField?.fieldname) {
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

const explicitFilters = computed(() => {
  return filters.value.filter((f) => !f.implicit);
});

const activeFilterCount = computed(() => {
  return explicitFilters.value.filter((filter) => filter.value).length;
});

const filterAppliedMessage = computed(() => {
  const count = activeFilterCount.value;
  if (count === 1) return t`1 filter applied`;
  return t`${count} filters applied`;
});

function getConditionLabel(value: string): Condition {
  const condition = conditions.find((c) => c.value === value);
  return (condition ? condition.label : value) as Condition;
}

function getConditionValue(label: string): string {
  const condition = conditions.find((c) => c.label === label);
  return condition ? condition.value : label;
}

function addNewFilter(): void {
  const df = fields.value[0];
  if (!df) return;
  addFilter(df.fieldname, 'like', '', false);
}

function addFilter(
  fieldname: string,
  condition: string,
  value: Filter['value'],
  implicit?: boolean
): void {
  const displayCondition = getConditionLabel(condition);
  const newFilter: Filter = {
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

function setFilter(queryFilters: QueryFilter, implicit?: boolean): void {
  filters.value = [];
  newFilters.value = [];

  for (const fieldname of Object.keys(queryFilters)) {
    const parts = queryFilters[fieldname];
    let condition: string;
    let value: Filter['value'];

    if (Array.isArray(parts)) {
      condition = parts[0];
      value = parts[1];
    } else {
      condition = '=';
      value = parts;
    }

    addFilter(fieldname, condition, value, implicit);
  }

  emitFilterChange();
}

function emitFilterChange(): void {
  const queryFilters: QueryFilter = {};

  for (const { condition, value, fieldname } of newFilters.value) {
    if (value === '' || value === null || value === undefined) {
      continue;
    }

    const sqlCondition = getConditionValue(condition);

    if (fieldname === 'numberSeries') {
      queryFilters.name = [sqlCondition, value];
    } else {
      queryFilters[fieldname] = [sqlCondition, value];
    }
  }

  emit('change', queryFilters);
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

defineExpose({
  setFilter,
});
</script>
