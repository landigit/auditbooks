<template>
  <div class="relative">
    <input
      :id="df.fieldname"
      :type="inputType"
      :class="[inputClasses, size === 'large' ? 'text-lg' : 'text-sm']"
      :value="value"
      :max="isNumeric(df) ? df.maxvalue : undefined"
      :min="isNumeric(df) ? df.minvalue : undefined"
      :readonly="isReadOnly"
      :tabindex="isReadOnly ? '-1' : '0'"
      placeholder=" "
      @focus="handleFocus"
      @blur="handleBlur"
      class="floating-label-input block px-2.5 pb-2.5 pt-4 w-full font-medium text-gray-900 dark:text-gray-100 bg-gray-25 dark:bg-gray-850 rounded-lg border border-gray-200 dark:border-gray-800 appearance-none focus:outline-none focus:ring-0 peer"
    />
    <label
      :for="df.fieldname"
      :class="[
        size === 'large' ? 'text-lg' : 'text-sm',
        shouldLabelFloat
          ? 'top-0 -translate-y-1/2 scale-75'
          : 'top-1/2 -translate-y-1/2 scale-100',
        'left-2.5',
      ]"
      class="absolute font-medium text-gray-500 duration-300 z-[2] origin-left bg-[#fbfbfb] dark:bg-[#282828] px-1.5 whitespace-nowrap pointer-events-none"
      >{{ df.label }}</label
    >
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import Base from '../Controls/Base.vue';

export default defineComponent({
  name: 'FloatingLabelInputBase',
  extends: Base,
  data() {
    return {
      focused: false,
    };
  },
  computed: {
    shouldLabelFloat(): boolean {
      return this.focused || !this.isEmpty;
    },
  },
  methods: {
    handleFocus(e: FocusEvent) {
      this.focused = true;
      if (!this.isReadOnly) {
        this.$emit('focus', e);
      }
    },
    handleBlur(e: FocusEvent) {
      this.focused = false;
      this.onBlur(e);
    },
  },
});
</script>
