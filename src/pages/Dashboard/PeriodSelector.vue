<template>
  <view v-if="!isLynx">
    <Dropdown ref="dropdown" class="text-sm" :items="periodOptions" right>
      <template
        #default="{ toggleDropdown, highlightItemUp, highlightItemDown, selectHighlightedItem }"
      >
        <view
          class="text-sm flex focus:outline-none hover:text-main focus:text-main items-center py-1 rounded-md leading-relaxed cursor-pointer"
          :class="!value ? 'text-description' : 'text-main'"
          tabindex="0"
          @tap="toggleDropdown()"
          @keydown.down="highlightItemDown"
          @keydown.up="highlightItemUp"
          @keydown.enter="selectHighlightedItem"
        >
          <text>{{ periodSelectorMap?.[value] ?? value }}</text>
          <lucide-icon name="chevron-down" class="ms-1 w-3 h-3" />
        </view>
      </template>
    </Dropdown>
  </view>
  <view v-else class="flex flex-row flex-wrap gap-2 px-2 py-1">
    <view
      v-for="opt in props.options"
      :key="opt"
      class="px-3 py-1 rounded-full border"
      :style="
        opt === value
          ? 'background: var(--color-accent); border-color: var(--color-accent);'
          : 'border-color: var(--color-border);'
      "
      @tap="() => selectOption(opt)"
    >
      <text
        class="text-xs font-medium"
        :style="opt === value ? 'color: #fff;' : 'color: var(--color-main);'"
        >{{ periodSelectorMap?.[opt] ?? opt }}</text
      >
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "fyo";
import Dropdown from "src/components/Dropdown.vue";
import { isLynx } from "src/utils/interactive";
import { PeriodKey } from "src/utils/types";

// Define Props
const props = withDefaults(
  defineProps<{
    value?: PeriodKey | "";
    options?: PeriodKey[];
  }>(),
  {
    value: "This Year",
    options: () => ["This Year", "This Quarter", "This Month", "YTD"],
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "change", value: PeriodKey): void;
}>();

// Template Ref for Dropdown component
const dropdown = ref<InstanceType<typeof Dropdown> | null>(null);

// Mappings & Options
const periodSelectorMap = computed<Record<PeriodKey | "", string>>(() => ({
  "": t`Set Period`,
  "This Year": t`This Year`,
  YTD: t`Year to Date`,
  "This Quarter": t`This Quarter`,
  "This Month": t`This Month`,
}));

const periodOptions = computed(() => {
  return props.options.map((option) => {
    const label = periodSelectorMap.value[option] ?? option;
    return {
      label,
      action: () => selectOption(option),
    };
  });
});

// Methods
const selectOption = (val: PeriodKey) => {
  emit("change", val);
  dropdown.value?.toggleDropdown(false);
};
</script>
