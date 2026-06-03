<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <input
      v-show="showInput"
      ref="inputEl"
      class="text-end"
      :class="[inputClasses, containerClasses]"
      :type="inputType"
      inputmode="decimal"
      :value="round(value)"
      :placeholder="inputPlaceholder"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      @blur="onBlur"
      @focus="onFocus"
      @input="(e: Event) => $emit('input', e)"
    />
    <div
      v-show="!showInput"
      class="whitespace-nowrap overflow-x-auto no-scrollbar"
      :class="[inputClasses, containerClasses]"
      tabindex="0"
      @click="activateInput"
      @focus="activateInput"
    >
      {{ formattedValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { isPesa } from 'fyo/utils';
import { Money } from 'pesa';
import { fyo } from 'src/initFyo';
import { safeParsePesa } from 'src/utils/core/index';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';

interface CurrencyProps extends BaseControlProps {
  focusInput?: boolean;
}

const props = withDefaults(defineProps<CurrencyProps>(), {
  focusInput: false,
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

const showInput = ref(false);
const currencySymbol = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

const {
  doc,
  labelClasses,
  inputClasses,
  containerClasses,
  isReadOnly,
  inputPlaceholder,
  triggerChange,
  focus,
} = useBaseControl(props, emit, inputEl);

// Since Float/Int overridden inputType, for Currency we want number
const inputType = computed(() => 'number');

onMounted(() => {
  if (props.focusInput) {
    showInput.value = true;
    nextTick(() => {
      focus();
    });
  }
});

const formattedValue = computed(() => {
  const parsedVal = parse(props.value);
  return fyo.format(parsedVal, props.df, doc.value);
});

const onFocus = (e: FocusEvent) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  target.select();
  showInput.value = true;
  emit('focus', e);
};

const round = (v: unknown) => {
  if (!isPesa(v)) {
    v = parse(v);
  }

  if (isPesa(v)) {
    return v.round();
  }

  return fyo.pesa(0).round();
};

const parse = (value: unknown): Money => {
  return safeParsePesa(value, fyo);
};

const onBlur = (e: FocusEvent) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  showInput.value = false;
  triggerChange(target.value);
};

const activateInput = () => {
  if (isReadOnly.value) {
    return;
  }

  showInput.value = true;
  nextTick(() => {
    focus();
  });
};

defineExpose({
  showInput,
  currencySymbol,
  inputEl,
  formattedValue,
  onFocus,
  round,
  parse,
  onBlur,
  activateInput,
  focus,
  isReadOnly,
  containerClasses,
  inputClasses,
  labelClasses,
  inputPlaceholder,
});
</script>
