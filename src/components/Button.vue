<template>
  <button
    class="flex justify-center items-center text-sm font-medium transition-all duration-100 active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
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
        'btn-primary': this.type === 'primary',
        'btn-secondary': this.type !== 'primary',
        'h-8': this.background,
        'px-3': this.padding && this.icon,
        'px-6': this.padding && !this.icon,
        'border-none': !this.background,
      };
    },
  },
});
</script>
<style scoped>
button {
  border-radius: 4px;
}

.btn-primary {
  background-color: var(--primary) !important;
  color: var(--primary-foreground) !important;
  border: 1.5px solid var(--primary) !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-primary:hover {
  background-color: color-mix(in srgb, var(--primary) 90%, black) !important;
  border-color: color-mix(in srgb, var(--primary) 90%, black) !important;
  color: var(--primary-foreground) !important;
}

.dark .btn-primary:hover {
  background-color: color-mix(in srgb, var(--primary) 90%, white) !important;
  border-color: color-mix(in srgb, var(--primary) 90%, white) !important;
}

.btn-secondary {
  background-color: var(--secondary) !important;
  color: var(--secondary-foreground) !important;
  border: 1.5px solid var(--border) !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn-secondary:hover {
  background-color: var(--accent) !important;
  color: var(--accent-foreground) !important;
  border-color: var(--border) !important;
}

button.border-none {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>
