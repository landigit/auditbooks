<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <DateTimePicker
      v-if="!isReadOnly"
      :model-value="dateValue"
      :placeholder="inputPlaceholder"
      @update:model-value="handleDateChange"
    />
    <div
      v-else
      class="flex"
      :class="[containerClasses, sizeClasses]"
      tabindex="-1"
    >
      <p
        v-if="!isEmpty"
        :class="[baseInputClasses]"
        class="overflow-auto no-scrollbar whitespace-nowrap text-description"
      >
        {{ formattedValue }}
      </p>
      <p
        v-else-if="inputPlaceholder"
        class="text-base text-description w-full opacity-50"
      >
        {{ inputPlaceholder }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { computed, ref } from 'vue';
import { fyo } from 'src/initFyo';
import { DateTimePicker } from 'src/components/Ui';
import { BaseControlProps, useBaseControl } from 'src/composables/useBaseControl';

// --- Props & Emits ---
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

// --- State ---
const inputRef = ref<HTMLElement | null>(null);

const {
  doc,
  labelClasses,
  isReadOnly,
  containerClasses,
  sizeClasses,
  isEmpty,
  baseInputClasses,
  inputPlaceholder,
  parse,
  triggerChange
} = useBaseControl(props, emit, inputRef);

// --- Computed ---
const dateValue = computed<Date | null>(() => {
  if (!props.value) return null;
  const d = new Date(props.value as string);
  return isNaN(d.getTime()) ? null : d;
});

const formattedValue = computed<string>(() => {
  const val = parse(props.value);
  return fyo.format(val, props.df, doc.value);
});

// --- Methods ---
function handleDateChange(val: Date | null) {
  if (!val) {
    triggerChange(null);
    return;
  }
  // Store as ISO string which is the standard in this app
  triggerChange(val.toISOString());
}
</script>
