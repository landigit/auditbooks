<template>
  <div
    class="flex items-center bg-canvas-muted border-border rounded-md text-sm p-1 border"
  >
    <div
      class="rate-container gap-2"
      :class="disabled ? 'bg-canvas-muted' : 'bg-canvas'"
    >
      <input
        class="text-right text-description border-transparent focus:outline-none focus:ring-1 focus:ring-main bg-transparent border"
        v-model="fromValue"
        type="number"
        :disabled="disabled"
        min="0"
      />

      <span class="text-description">{{ left }}</span>
    </div>

    <p class="mx-1 text-description">=</p>

    <div
      class="rate-container gap-2"
      :class="disabled ? 'bg-canvas-muted' : 'bg-canvas'"
    >
      <input
        class="text-right text-description border-transparent focus:outline-none focus:ring-1 focus:ring-main bg-transparent border"
        type="number"
        :value="isSwapped ? fromValue / exchangeRate : exchangeRate * fromValue"
        :disabled="disabled"
        min="0"
        @change="rightChange"
      />
      <span class="text-description">{{ right }}</span>
    </div>

    <button
      v-if="!disabled"
      class="bg-indicator-green-bg text-indicator-green-text px-2 ms-1 -me-0.5 h-full border-s border-border"
      @click="swap"
    >
      <lucide-icon
        name="refresh-cw"
        class="w-3 h-3 text-indicator-green-text"
      />
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { safeParseFloat } from 'src/utils/core/index';

const props = defineProps({
  disabled: { type: Boolean, default: false },
  fromCurrency: { type: String, default: 'USD' },
  toCurrency: { type: String, default: 'INR' },
  exchangeRate: { type: Number, default: 75 },
});

const emit = defineEmits(['change']);

const fromValue = ref(1);
const isSwapped = ref(false);

const left = computed(() => {
  if (isSwapped.value) {
    return props.toCurrency;
  }
  return props.fromCurrency;
});

const right = computed(() => {
  if (isSwapped.value) {
    return props.fromCurrency;
  }
  return props.toCurrency;
});

function swap() {
  isSwapped.value = !isSwapped.value;
}

function rightChange(e: Event) {
  let value: string | number = 1;
  if (e.target instanceof HTMLInputElement) {
    value = e.target.value;
  }

  value = safeParseFloat(value);

  let exchangeRate = value / fromValue.value;
  if (isSwapped.value) {
    exchangeRate = fromValue.value / value;
  }

  emit('change', exchangeRate);
}
</script>
<style scoped>
@reference "../../styles/index.css";
input[type='number'] {
  @apply w-12 bg-transparent p-0.5;
}

.rate-container {
  @apply flex items-center rounded-md border-border text-main text-sm px-1 focus-within:border-border bg-transparent;
}

.rate-container > p {
  @apply text-xs text-description;
}
</style>
