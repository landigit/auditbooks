<template>
  <view>
    <view v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </view>
    <Popover
      :open="dropdownVisible"
      @update:open="(val) => (dropdownVisible = val)"
    >
      <PopoverAnchor as-child>
        <view
          class="relative flex items-center justify-between"
          :class="[
            inputClasses,
            containerClasses,
            dropdownVisible ? 'hover:bg-surface-hover' : '',
          ]"
          @tap="toggleDropdown"
        >
          <view
            class="flex items-center justify-between bg-transparent w-full cursor-pointer custom-scroll custom-scroll-thumb2"
            :class="{
              'pointer-events-none': isReadOnly,
              'text-description': !value,
            }"
          >
            <text
              v-if="selectValue || value"
              class="cursor-text text-main w-full"
              >{{ selectValue ? selectValue : value }}</text
            >
            <text v-else>{{ inputPlaceholder }}</text>
            <LucideIcon
              v-if="!isReadOnly"
              name="chevrons-up-down"
              :size="12"
              class="me-[-3px]"
              :class="showMandatory ? 'text-error' : 'text-description'"
            />
          </view>
        </view>
      </PopoverAnchor>
      <PopoverContent
        class="bg-surface text-main rounded w-[var(--reka-popover-trigger-width)] min-w-40 overflow-hidden p-0 border border-border shadow-lg"
      >
        <ul
          class="max-h-40 p-1 overflow-auto custom-scroll custom-scroll-thumb1 text-sm"
        >
          <li
            v-for="option in options"
            :key="option.value"
            class="p-1.5 rounded-md hover:bg-surface-hover flex cursor-pointer"
            :class="selectValue !== option.label ? 'pl-6' : 'pl-2'"
            @tap="selectOption(option)"
          >
            <LucideIcon
              v-if="selectValue === option.label"
              name="check"
              :size="16"
              class="mr-1"
            />
            {{ option.label }}
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';
import { SelectOption } from 'schemas/types';
import { Popover, PopoverAnchor, PopoverContent } from 'src/components/ui';
import LucideIcon from '../LucideIcon.vue';

interface SelectProps extends BaseControlProps {
  closeDropDown?: boolean;
}

const props = withDefaults(defineProps<SelectProps>(), {
  closeDropDown: true,
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

const dropdownVisible = ref(false);
const selectValue = ref<any>(props.value);

const inputRef = ref<HTMLElement | null>(null);
const {
  labelClasses,
  inputClasses,
  containerClasses,
  inputPlaceholder,
  isReadOnly,
  showMandatory,
  triggerChange,
  focus,
} = useBaseControl(props as any, emit, inputRef);

const options = computed<SelectOption[]>(() => {
  if (props.df.fieldtype !== 'Select') {
    return [];
  }
  return props.df.options || [];
});

const toggleDropdown = () => {
  if (!props.closeDropDown) {
    dropdownVisible.value = true;
  } else if (!isReadOnly.value) {
    dropdownVisible.value = !dropdownVisible.value;
  }
};

const selectOption = (option: SelectOption) => {
  selectValue.value = option.label;
  triggerChange(option.value);

  if (props.closeDropDown) {
    dropdownVisible.value = !dropdownVisible.value;
  }
};

defineExpose({
  focus,
});
</script>
