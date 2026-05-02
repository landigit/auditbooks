<template>
  <button
    class="rounded-md flex justify-center items-center text-sm"
    :disabled="disabled"
    :class="_class"
    v-bind="$attrs"
  >
    <slot></slot>
  </button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Button',
  props: {
    type: {
      type: String,
      default: 'secondary',
    },
    icon: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    padding: {
      type: Boolean,
      default: true,
    },
    background: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    _class() {
      return {
        'opacity-50 cursor-not-allowed pointer-events-none': this.disabled,
        'text-button-primary-text': this.type === 'primary',
        'bg-button-primary-bg': this.type === 'primary' && this.background,
        'text-button-secondary-text': this.type !== 'primary',
        'bg-button-secondary-bg': this.type !== 'primary' && this.background,
        'h-8': this.background,
        'px-3': this.padding && this.icon,
        'px-6': this.padding && !this.icon,
      };
    },
  },
});
</script>
<style scoped>
button:focus {
  filter: brightness(0.95);
}
</style>
