<template>
  <Dropdown ref="dropdown" class="text-sm" :items="periodOptions" right>
    <template
      #default="{
        toggleDropdown,
        highlightItemUp,
        highlightItemDown,
        selectHighlightedItem,
      }"
    >
      <div
        class="text-sm flex focus:outline-none hover:text-gray-800 dark:hover:text-gray-100 focus:text-gray-800 dark:focus:text-gray-100 items-center py-1 rounded-md leading-relaxed cursor-pointer"
        :class="
          !value
            ? 'text-gray-600 dark:text-gray-500'
            : 'text-gray-900 dark:text-gray-300'
        "
        tabindex="0"
        @click="toggleDropdown()"
        @keydown.down="highlightItemDown"
        @keydown.up="highlightItemUp"
        @keydown.enter="selectHighlightedItem"
      >
        {{ periodSelectorMap[value] ?? value }}
        <feather-icon name="chevron-down" class="ms-1 w-3 h-3" />
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t } from 'fyo';
import Dropdown from 'src/components/Dropdown.vue';
import { PeriodKey } from 'src/utils/types';

const props = withDefaults(
  defineProps<{
    value?: PeriodKey;
    options?: PeriodKey[];
  }>(),
  {
    value: 'This Year',
    options: () => ['This Year', 'This Quarter', 'This Month', 'YTD'],
  }
);

const emit = defineEmits<{
  (e: 'change', value: PeriodKey): void;
}>();

const dropdown = ref<InstanceType<typeof Dropdown> | null>(null);

const periodSelectorMap: Record<PeriodKey | '', string> = {
  '': t`Set Period`,
  'This Year': t`This Year`,
  YTD: t`Year to Date`,
  'This Quarter': t`This Quarter`,
  'This Month': t`This Month`,
};

const periodOptions = computed(() => {
  return props.options.map((option) => {
    const label = periodSelectorMap[option] ?? option;
    return {
      label,
      action: () => selectOption(option),
    };
  });
});

const selectOption = (val: PeriodKey) => {
  emit('change', val);
  dropdown.value?.toggleDropdown(false);
};
</script>
