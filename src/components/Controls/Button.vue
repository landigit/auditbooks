<template>
  <div
    :class="[containerClasses]"
    class="mt-6 w-full text-main text-base focus:outline-none"
  >
    <label class="flex w-full">
      <button
        ref="inputRef"
        type="button"
        @click="onClick"
        :disabled="isReadOnly"
        class="w-full flex items-center justify-center py-2.5 px-4 rounded-lg font-medium bg-indicator-blue-bg text-indicator-blue-text hover:bg-indicator-blue-bg/90 active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {{ df.label }}
      </button>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { BaseControlProps, useBaseControl } from 'src/composables/useBaseControl';

interface ButtonProps extends BaseControlProps {
  spaceBetween?: boolean;
  labelRight?: boolean;
  labelClass?: string;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  spaceBetween: true,
  labelRight: false,
  labelClass: '',
  showLabel: true,
  step: 1,
  border: false,
  size: 'large',
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

const inputRef = ref<HTMLButtonElement | null>(null);

const {
  containerClasses,
  isReadOnly,
  triggerChange,
} = useBaseControl(props, emit, inputRef);

const labelClasses = computed(() => {
  return props.labelClass || 'text-description text-base';
});

const onClick = () => {
  if (isReadOnly.value) return;
  triggerChange(true);
};

// Expose properties to match Base requirements if any parent checks them
defineExpose({
  isReadOnly,
  containerClasses,
  labelClasses,
  onClick,
  inputRef,
});
</script>
