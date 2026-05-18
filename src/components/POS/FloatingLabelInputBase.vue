<template>
  <div class="relative">
    <input
      ref="inputRef"
      :type="inputType"
      :class="[inputClasses, size === 'large' ? 'text-lg' : 'text-sm']"
      :value="value as any"
      :max="isNumeric(df) ? (df as any).maxvalue : undefined"
      :min="isNumeric(df) ? (df as any).minvalue : undefined"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      @blur="onBlur"
      class="block px-2.5 pb-2.5 pt-4 w-full font-medium text-main bg-canvas-muted rounded-lg border border-border appearance-none focus:outline-none focus:ring-0 peer"
    />
    <label
      for="floating_outlined"
      :class="size === 'large' ? 'text-xl' : 'text-md'"
      class="absolute font-medium text-description duration-300 transform -translate-y-4 scale-75 top-1 z-10 origin-[0] bg-surface px-2 peer-focus:px-2 peer-focus:text-indicator-blue-text peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1"
      >{{ df.label }}</label
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';

const props = withDefaults(defineProps<BaseControlProps>(), {
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

const inputRef = ref<HTMLInputElement | null>(null);

const { inputType, inputClasses, isReadOnly, onBlur, isNumeric, focus } =
  useBaseControl(props as any, emit, inputRef);

defineExpose({
  focus,
});
</script>
