<template>
  <view class="relative">
    <input
      ref="inputRef"
      :type="inputType"
      :class="[inputClasses, size === 'large' ? 'text-lg' : 'text-sm']"
      :value="round(value)"
      :max="isNumeric(df) ? (df as any).maxvalue : undefined"
      :min="isNumeric(df) ? (df as any).minvalue : undefined"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      @blur="onBlur"
      class="block px-2.5 pb-2.5 pt-4 w-full font-medium text-main bg-canvas-muted rounded-lg border border-border appearance-none focus:outline-none focus:ring-0 peer"
    />
    <text
      for="floating_outlined"
      :class="size === 'large' ? 'text-xl' : 'text-md'"
      class="absolute font-medium text-description duration-300 transform -translate-y-4 scale-75 top-8 z-10 origin-[0] bg-surface px-2 peer-focus:px-2 peer-focus:text-indicator-blue-text peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1"
      >{{ currency ? fyo.currencySymbols[currency] : undefined }}</text
    >
    <text
      for="floating_outlined"
      :class="size === 'large' ? 'text-xl' : 'text-md'"
      class="absolute font-medium text-description duration-300 transform -translate-y-4 scale-75 top-1 z-10 origin-[0] bg-surface px-2 peer-focus:px-2 peer-focus:text-indicator-blue-text peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1"
      >{{ df.label }}</text
    >
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { BaseControlProps, useBaseControl } from "src/composables/useBaseControl";
import { safeParsePesa } from "utils/index";
import { isPesa } from "fyo/utils";
import { fyo } from "src/initFyo";
import { Money } from "pesa";

const props = withDefaults(defineProps<BaseControlProps>(), {
  step: 1,
  border: false,
  size: "large",
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
});

const emit = defineEmits<{
  (e: "focus", ev: FocusEvent): void;
  (e: "input", ev: Event): void;
  (e: "change", val: any): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const parse = (value: unknown): Money => {
  return safeParsePesa(value, fyo);
};

const { inputType, inputClasses, isReadOnly, onBlur, isNumeric, focus } = useBaseControl(
  props as any,
  emit,
  inputRef,
);

const currency = computed<string | undefined>(() => {
  if (props.value) {
    return (props.value as Money).getCurrency();
  }
});

const round = (v: unknown) => {
  if (!isPesa(v)) {
    v = parse(v);
  }

  if (isPesa(v)) {
    return v.round();
  }

  return fyo.pesa(0).round();
};

defineExpose({
  focus,
});
</script>
