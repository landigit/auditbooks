<template>
  <div
    class="px-4 flex justify-between items-center h-row-largest flex-shrink-0 bg-surface"
    :class="[
      border ? 'border-b border-border' : '',
      store.platform !== 'Windows' ? 'window-drag' : '',
    ]"
  >
    <Transition name="spacer" class="border-none">
      <div
        v-if="
          !store.showSidebar &&
          store.platform === 'Mac' &&
          store.languageDirection !== 'rtl'
        "
        class="h-full"
        :class="spacerClass"
      />
    </Transition>

    <div
      class="flex items-center window-no-drag gap-4 me-auto"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <!-- Nav Group -->
      <PageHeaderNavGroup />
      <h1
        v-if="title"
        class="text-xl font-semibold select-none whitespace-nowrap text-main"
      >
        {{ title }}
      </h1>

      <!-- Left Slot -->
      <div class="flex items-stretch window-no-drag gap-4">
        <slot name="left" />
      </div>
    </div>

    <!-- Right (regular) Slot -->
    <div
      class="flex items-stretch window-no-drag gap-2 ms-auto"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
import { useAppStore } from 'src/stores/app';
import { defineComponent, Transition, defineAsyncComponent } from 'vue';

export default defineComponent({
  components: {
    Transition,
    PageHeaderNavGroup: defineAsyncComponent(
      () => import('./PageHeaderNavGroup.vue')
    ),
  },
  props: {
    title: { type: String, default: '' },
    border: { type: Boolean, default: true },
    searchborder: { type: Boolean, default: true },
  },
  setup() {
    return { store: useAppStore() };
  },
  computed: {
    showBorder() {
      return !!this.$slots.default && this.searchborder;
    },
    spacerClass() {
      if (this.store.showSidebar) {
        return '';
      }

      if (this.border) {
        return 'w-tl me-4 border-e border-border';
      }

      return 'w-tl me-4';
    },
  },
});
</script>
<style scoped>
.w-tl {
  width: var(--w-trafficlights);
}

.spacer-enter-from,
.spacer-leave-to {
  opacity: 0;
  width: 0px;
  margin-right: 0px;
  border-right-width: 0px;
}

.spacer-enter-to,
.spacer-leave-from {
  opacity: 1;
  width: var(--w-trafficlights);
  margin-right: 1rem;
  border-right-width: 1px;
}

.spacer-enter-active,
.spacer-leave-active {
  transition: all 150ms ease-out;
}
</style>
