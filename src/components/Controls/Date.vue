<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <input
      v-show="showInput"
      ref="input"
      :class="[inputClasses, containerClasses]"
      :type="inputType"
      :value="inputValue"
      :placeholder="inputPlaceholder"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      @blur="onBlur"
      @focus="onFocus"
      @input="(e) => $emit('input', e)"
    />
    <div
      v-show="!showInput"
      class="flex"
      :class="[containerClasses, sizeClasses]"
      tabindex="0"
      @click="activateInput"
      @focus="activateInput"
    >
      <p
        v-if="!isEmpty"
        :class="[baseInputClasses]"
        class="overflow-auto no-scrollbar whitespace-nowrap dark:text-gray-100"
      >
        {{ formattedValue }}
      </p>
      <p v-else-if="inputPlaceholder" class="text-base text-gray-500 w-full">
        {{ inputPlaceholder }}
      </p>

      <button v-if="!isReadOnly" class="-me-0.5 ms-1">
        <LucideIcon
          name="calendar"
          class="w-4 h-4 transition-colors duration-200"
          :size="16"
          :class="
            showInput ? 'text-blue-500' : (showMandatory ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')
          "
        />
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import { fyo } from 'src/initFyo';
import { defineComponent, nextTick } from 'vue';
import LucideIcon from '../LucideIcon.vue';
import Base from './Base.vue';

export default defineComponent({
  components: { LucideIcon },
  extends: Base,
  emits: ['input', 'focus'],
  data() {
    return {
      showInput: false,
    };
  },
  computed: {
    inputValue(): string {
      let value = this.value;
      if (typeof value === 'string') {
        value = new Date(value);
      }

      if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return DateTime.fromJSDate(value).toISODate();
      }

      return '';
    },
    inputType() {
      return 'date';
    },
    formattedValue() {
      const value = this.parse(this.value);
      return fyo.format(value, this.df, this.doc);
    },
    borderClasses(): string {
      if (!this.border) {
        return '';
      }

      const border = 'border border-gray-200 dark:border-gray-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20';
      let background = 'bg-white dark:bg-gray-875 shadow-sm transition-all duration-200';
      if (this.isReadOnly) {
        background = 'bg-gray-50 dark:bg-gray-850';
      }

      if (this.showInput) {
        return background + ' ring-2 ring-blue-500/30 border-blue-500/50';
      }

      return border + ' ' + background;
    },
  },
  methods: {
    onFocus(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      target.select();
      this.showInput = true;
      this.$emit('focus', e);
    },
    onBlur(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      this.showInput = false;

      let value: Date | null = DateTime.fromISO(target.value).toJSDate();
      if (Number.isNaN(value.valueOf())) {
        value = null;
      }

      this.triggerChange(value);
    },
    activateInput() {
      if (this.isReadOnly) {
        return;
      }

      this.showInput = true;
      nextTick(() => {
        this.focus();

        // @ts-ignore
        this.$refs.input.showPicker();
      });
    },
  },
});
</script>
