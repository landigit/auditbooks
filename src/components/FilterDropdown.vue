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
      <Button :icon="isMobile" @click="togglePopover()">
        <span class="flex items-center">
          <feather-icon name="filter" class="w-4 h-4 text-current" />
          <span class="md:ms-1">
            <template v-if="activeFilterCount > 0">
              {{ filterAppliedMessage }}
            </template>
            <template v-else>
              <span class="hidden md:inline">{{ t`Filter` }}</span>
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
                  class="cursor-pointer w-4 h-4 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 rounded-md group"
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
                  class="w-40"
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
                  class="w-28"
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
                  class="w-36"
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
            <span class="text-base text-gray-600 dark:text-gray-500">{{
              t`No filters selected`
            }}</span>
          </template>
        </div>
        <div class="flex justify-between border-t dark:border-gray-800">
          <div
            class="text-base border-t dark:border-gray-800 p-2 flex items-center text-gray-600 dark:text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-875"
            @click.stop="addNewFilter"
          >
            <feather-icon name="plus" class="w-4 h-4" />
            <span class="ms-2">{{ t`Add a filter` }}</span>
          </div>

          <div class="flex">
            <div
              v-if="filters.length"
              class="text-base p-2 flex items-center text-gray-600 dark:text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-875"
              @click="clearAllFilters"
            >
              <feather-icon name="trash-2" class="w-4 h-4" />
              <span class="ms-2">{{ t`Clear` }}</span>
            </div>

            <div
              v-if="filters.length"
              @click="applyFilters"
              class="text-base border-t dark:border-gray-800 p-2 flex items-center text-gray-600 dark:text-gray-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-875"
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
import { useApp } from 'src/composables/useApp.js';
import { useBreakpoint } from 'src/composables/useBreakpoint';
import Button from './Button.vue';
import Data from './Controls/Data.vue';
import Select from './Controls/Select.vue';
import Icon from './Icon.vue';
import Popover from './Popover.vue';
import { useFilterDropdown } from '../composables/useFilterDropdown.js';

const { t } = useApp();
const { isMobile } = useBreakpoint();

const props = defineProps<{ schemaName: string }>();
const emit = defineEmits<{ (e: 'change', filters: any): void }>();

const {
  filters,
  newFilters,
  fields,
  fieldOptions,
  conditionsForDropdown,
  explicitFilters,
  activeFilterCount,
  filterAppliedMessage,
  getRandomString,
  addNewFilter,
  applyFilters,
  removeFilter,
  clearAllFilters,
  updateNewFilters,
  setFilter,
  emitFilterChange,
} = useFilterDropdown(props, emit);

defineExpose({
  setFilter,
  clearAllFilters,
});
</script>
