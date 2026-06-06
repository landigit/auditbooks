<template>
  <view class="w-full" :title="df.label">
    <view v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </view>
    <view :class="[showMandatory ? 'show-mandatory' : '', 'w-full']">
      <input
        ref="inputRef"
        spellcheck="false"
        class="bg-transparent"
        :class="[inputClasses, containerClasses]"
        :type="inputType"
        :value="value"
        :placeholder="inputPlaceholder"
        :readonly="isReadOnly"
        :step="step"
        :max="isNumeric(df) ? (df as any).maxvalue : undefined"
        :min="isNumeric(df) ? (df as any).minvalue : undefined"
        :style="containerStyles"
        :tabindex="isReadOnly ? '-1' : '0'"
        @blur="onBlur"
        @focus="(e) => !isReadOnly && $emit('focus', e)"
        @input="(e) => !isReadOnly && $emit('input', e)"
      />
    </view>
    <view v-if="showLabel" :class="labelClasses">
      {{ df?.sub_label }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  BaseControlProps,
  useBaseControl,
} from "src/composables/useBaseControl";

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

const {
  inputType,
  labelClasses,
  inputClasses,
  containerClasses,
  inputPlaceholder,
  isReadOnly,
  showMandatory,
  onBlur,
  isNumeric,
  focus,
  triggerChange,
  parse,
} = useBaseControl(props as any, emit, inputRef);

onMounted(() => {
  if (
    typeof window !== "undefined" &&
    inputRef.value &&
    inputType.value === "number"
  ) {
    inputRef.value.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
      },
      { passive: false },
    );
  }
});

defineExpose({
  focus,
  triggerChange,
  parse,
  isNumeric,
  inputRef,
  inputType,
  labelClasses,
  inputClasses,
  containerClasses,
  inputPlaceholder,
  isReadOnly,
  showMandatory,
  onBlur,
});
</script>
