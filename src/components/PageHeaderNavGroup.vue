<template>
  <div class="flex">
    <SearchBar />
    <!-- Back Button -->
    <a
      ref="backlink"
      class="nav-link border-l border-r border-border bg-canvas-muted"
      :class="
        historyState.back ? 'text-main cursor-pointer' : 'text-description'
      "
      @click="$router.back()"
    >
      <feather-icon name="chevron-left" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      class="nav-link rounded-md rounded-l-none bg-canvas-muted"
      :class="
        historyState.forward ? 'text-main cursor-pointer' : 'text-description'
      "
      @click="$router.forward()"
    >
      <feather-icon name="chevron-right" class="w-4 h-4" />
    </a>
  </div>
</template>
<script lang="ts">
import { shortcutsKey } from 'src/utils/injectionKeys';
import { ref, inject } from 'vue';
import { defineComponent } from 'vue';
import SearchBar from './SearchBar.vue';
import { historyState } from 'src/utils/refs';

const COMPONENT_NAME = 'PageHeaderNavGroup';

export default defineComponent({
  components: { SearchBar },
  setup() {
    return {
      historyState,
      backlink: ref<HTMLAnchorElement | null>(null),
      shortcuts: inject(shortcutsKey),
    };
  },
  computed: {
    hasBack() {
      return !!history.back;
    },
    hasForward() {
      return !!history.forward;
    },
  },
  activated() {
    this.shortcuts?.shift.set(COMPONENT_NAME, ['Backspace'], () => {
      this.backlink?.click();
    });
    // @ts-ignore
    window.ng = this;
  },
  deactivated() {
    this.shortcuts?.delete(COMPONENT_NAME);
  },
});
</script>

<style scoped>
@reference "../styles/index.css";
.nav-link {
  @apply flex items-center bg-canvas-muted px-3;
}
</style>
