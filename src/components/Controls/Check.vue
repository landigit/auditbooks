<template>
  <div :class="[inputClasses, containerClasses]">
    <label
      class="flex items-center"
      :class="[
        spaceBetween ? 'justify-between' : '',
        isReadOnly ? 'cursor-default' : 'cursor-pointer select-none group',
      ]"
    >
      <div
        v-if="showLabel && !labelRight"
        class="me-3 transition-colors duration-200"
        :class="labelClasses"
      >
        {{ df.label }}
      </div>
      <div
        style="width: 16px; height: 16px"
        class="relative flex items-center justify-center transition-transform duration-200 active:scale-90"
        :class="isReadOnly ? 'cursor-default' : 'cursor-pointer'"
      >
        <svg
          v-if="value"
          width="16"
          height="16"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="transition-all duration-200 transform scale-100"
        >
          <mask id="path-1-inside-1_107_160" fill="white">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM5.49955 10.8938L11.687 3.58135L10.313 2.41865L4.75726 8.98447L2.6364 6.8636L1.3636 8.1364L4.1761 10.9489L4.86774 11.6405L5.49955 10.8938Z"
            />
          </mask>
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M3 0C1.34315 0 0 1.34315 0 3V11C0 12.6569 1.34315 14 3 14H11C12.6569 14 14 12.6569 14 11V3C14 1.34315 12.6569 0 11 0H3ZM5.49955 10.8938L11.687 3.58135L10.313 2.41865L4.75726 8.98447L2.6364 6.8636L1.3636 8.1364L4.1761 10.9489L4.86774 11.6405L5.49955 10.8938Z"
            :fill="color"
          />
          <path
            d="M11.687 3.58135L12.4504 4.22729L13.0964 3.4639L12.333 2.81796L11.687 3.58135ZM5.49955 10.8938L6.26293 11.5398L6.26293 11.5398L5.49955 10.8938ZM10.313 2.41865L10.9589 1.65527L10.1955 1.00932L9.54957 1.77271L10.313 2.41865ZM4.75726 8.98447L4.05015 9.69158L4.81864 10.4601L5.52065 9.63041L4.75726 8.98447ZM2.6364 6.8636L3.3435 6.1565L2.6364 5.44939L1.92929 6.1565L2.6364 6.8636ZM1.3636 8.1364L0.656497 7.42929L-0.0506096 8.1364L0.656497 8.8435L1.3636 8.1364ZM4.1761 10.9489L3.469 11.656L3.469 11.656L4.1761 10.9489ZM4.86774 11.6405L4.16063 12.3476L4.92912 13.1161L5.63112 12.2865L4.86774 11.6405ZM1 3C1 1.89543 1.89543 1 3 1V-1C0.790861 -1 -1 0.790861 -1 3H1ZM1 11V3H-1V11H1ZM3 13C1.89543 13 1 12.1046 1 11H-1C-1 13.2091 0.790862 15 3 15V13ZM11 13H3V15H11V13ZM13 11C13 12.1046 12.1046 13 11 13V15C13.2091 15 15 13.2091 15 11H13ZM13 3V11H15V3H13ZM11 1C12.1046 1 13 1.89543 13 3H15C15 0.790861 13.2091 -1 11 -1V1ZM3 1H11V-1H3V1ZM10.9237 2.93541L4.73616 10.2479L6.26293 11.5398L12.4504 4.22729L10.9237 2.93541ZM9.66701 3.18204L11.0411 4.34473L12.333 2.81796L10.9589 1.65527L9.66701 3.18204ZM5.52065 9.63041L11.0763 3.06459L9.54957 1.77271L3.99387 8.33853L5.52065 9.63041ZM1.92929 7.57071L4.05015 9.69158L5.46437 8.27736L3.3435 6.1565L1.92929 7.57071ZM2.07071 8.8435L3.3435 7.57071L1.92929 6.1565L0.656497 7.42929L2.07071 8.8435ZM4.88321 10.2418L2.07071 7.42929L0.656497 8.8435L3.469 11.656L4.88321 10.2418ZM5.57485 10.9334L4.88321 10.2418L3.469 11.656L4.16063 12.3476L5.57485 10.9334ZM4.73616 10.2479L4.10435 10.9946L5.63112 12.2865L6.26293 11.5398L4.73616 10.2479Z"
            :fill="color"
            mask="url(#path-1-inside-1_107_160)"
          />
        </svg>

        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 14 14"
          :fill="offColor"
          xmlns="http://www.w3.org/2000/svg"
          class="transition-all duration-200 group-hover:scale-105"
        >
          <rect
            x="0.5"
            y="0.5"
            width="13"
            height="13"
            rx="3"
            :stroke="color"
            stroke-width="1.5"
            class="transition-colors duration-200 group-hover:stroke-accent"
          />
        </svg>

        <input
          ref="inputRef"
          type="checkbox"
          :checked="getChecked(value)"
          :readonly="isReadOnly"
          :tabindex="isReadOnly ? '-1' : '0'"
          @change="onChange"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <div
        v-if="showLabel && labelRight"
        class="ms-3 transition-colors duration-200"
        :class="labelClasses"
      >
        {{ df.label }}
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';

interface CheckProps extends BaseControlProps {
  spaceBetween?: boolean;
  labelRight?: boolean;
  labelClass?: string;
}

const props = withDefaults(defineProps<CheckProps>(), {
  spaceBetween: false,
  labelRight: true,
  labelClass: '',
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
  (e: 'change', val: any): void;
}>();

const offColor = ref('#0000');
const color = ref('var(--color-description)');
const inputRef = ref<HTMLInputElement | null>(null);

const { inputClasses, containerClasses, isReadOnly, triggerChange } =
  useBaseControl(props, emit, inputRef);

const labelClasses = computed(() => {
  return props.labelClass || 'text-description text-base';
});

const getChecked = (value: unknown) => {
  return Boolean(value);
};

const onChange = (e: Event) => {
  if (isReadOnly.value) {
    return;
  }

  const target = e.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  triggerChange(target.checked);
};

// Expose properties
defineExpose({
  isReadOnly,
  containerClasses,
  labelClasses,
  inputRef,
  onChange,
  getChecked,
});
</script>

<style scoped>
/* Keeping clean layout with zero hidden layout issues */
input[type='checkbox'] {
  display: none;
}
</style>
