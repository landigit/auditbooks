<template>
  <div class="relative">
    <input
      :id="df.fieldname"
      :type="inputType"
      :class="[
        inputClasses,
        size === 'large' ? 'text-lg' : 'text-sm',
        currency ? 'ps-9 has-currency' : 'ps-2.5',
      ]"
      :value="round(value)"
      :max="isNumeric(df) ? df.maxvalue : undefined"
      :min="isNumeric(df) ? df.minvalue : undefined"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      placeholder=" "
      @focus="handleFocus"
      @blur="handleBlur"
      class="floating-label-input block pe-2.5 pb-2.5 pt-4 w-full font-medium text-gray-900 dark:text-gray-100 bg-gray-25 dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-800 appearance-none focus:outline-none focus:ring-0 peer"
    />
    <span
      v-if="currency"
      :class="size === 'large' ? 'text-lg' : 'text-sm'"
      class="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-gray-500 pointer-events-none dark:text-gray-400"
    >
      {{ fyo.currencySymbols[currency] }}
    </span>
    <label
      :for="df.fieldname"
      :class="[
        size === 'large' ? 'text-lg' : 'text-sm',
        shouldLabelFloat
          ? 'top-0 -translate-y-1/2 scale-75 left-2.5'
          : currency
            ? 'top-1/2 -translate-y-1/2 scale-100 left-8'
            : 'top-1/2 -translate-y-1/2 scale-100 left-2.5',
      ]"
      class="absolute font-medium text-gray-500 duration-300 z-[2] origin-left bg-[#fbfbfb] dark:bg-[#282828] px-1.5 whitespace-nowrap pointer-events-none"
      >{{ df.label }}</label
    >
  </div>
</template>

<script lang="ts">
import FloatingLabelInputBase from './FloatingLabelInputBase.vue';
import { safeParsePesa } from 'utils/index';
import { isPesa } from 'fyo/utils';
import { fyo } from 'src/initFyo';
import { defineComponent } from 'vue';
import { Money } from 'pesa';

export default defineComponent({
  name: 'FloatingLabelCurrencyInput',
  extends: FloatingLabelInputBase,
  computed: {
    currency(): string | undefined {
      if (this.value) {
        return (this.value as Money).getCurrency();
      }
    },
    shouldLabelFloat(): boolean {
      // Currency fields always have value / symbol layout so the label must always float
      return true;
    },
  },
  methods: {
    round(v: unknown) {
      if (!isPesa(v)) {
        v = this.parse(v);
      }

      if (isPesa(v)) {
        return v.round();
      }

      return fyo.pesa(0).round();
    },
    parse(value: unknown): Money {
      return safeParsePesa(value, this.fyo);
    },
  },
});
</script>
