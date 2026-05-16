<template>
  <div
    :class="[containerClasses]"
    class="mt-6 w-full text-main text-base focus:outline-none"
  >
    <label class="flex w-full">
      <button
        type="button"
        @click="onClick"
        :disabled="isReadOnly"
        class="w-full flex items-center justify-center p-2 rounded-md bg-indicator-blue-bg text-indicator-blue-text hover:shadow-md hover:-translate-y-[1px] transition"
      >
        {{ df.label }}
      </button>
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Base from './Base.vue';

export default defineComponent({
  name: 'Button',
  extends: Base,
  props: {
    spaceBetween: {
      type: Boolean,
      default: true,
    },
    labelRight: {
      type: Boolean,
      default: false,
    },
    labelClass: {
      type: String,
      default: '',
    },
    showLabel: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    labelClasses() {
      return this.labelClass || 'text-description text-base';
    },
  },
  methods: {
    onClick() {
      if (this.isReadOnly) return;
      this.triggerChange(true);
    },
  },
});
</script>
