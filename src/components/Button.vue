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
        'text-white dark:text-black': this.type === 'primary',
        'bg-white dark:bg-black text-black dark:text-white border border-gray-200 dark:border-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900':
          this.type !== 'primary' && this.background,
        'bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white hover:opacity-90 shadow-vercel dark:shadow-vercel-dark':
          this.type === 'primary' && this.background,
        'h-8': this.background,
        'px-3': this.padding && this.icon,
        'px-6': this.padding && !this.icon,
      };
    },
  },
});
</script>
<style scoped>
button:focus-visible {
  @apply outline-none ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-black;
}

button:hover {
  filter: brightness(1.05);
}

button:active {
  transform: scale(0.98);
}
</style>
