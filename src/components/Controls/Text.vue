<template>
  <view>
    <view v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </view>
    <view :class="showMandatory ? 'show-mandatory' : ''">
      <textarea
        ref="inputRef"
        :rows="df.rows ?? rows"
        :class="['resize-none bg-transparent', inputClasses, containerClasses]"
        :value="value as any"
        :placeholder="inputPlaceholder"
        style="vertical-align: top"
        :readonly="isReadOnly"
        :tabindex="isReadOnly ? '-1' : '0'"
        @blur="onBlur"
        @focus="(e) => $emit('focus', e)"
        @input="(e) => $emit('input', e)"
      ></textarea>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { BaseControlProps, useBaseControl } from "src/composables/useBaseControl";

interface TextProps extends BaseControlProps {
  rows?: number;
}

const props = withDefaults(defineProps<TextProps>(), {
  rows: 3,
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

const inputRef = ref<HTMLTextAreaElement | null>(null);

const {
  labelClasses,
  inputClasses,
  containerClasses,
  inputPlaceholder,
  isReadOnly,
  showMandatory,
  onBlur,
  focus,
} = useBaseControl(props as any, emit, inputRef);

defineExpose({
  focus,
});
</script>
