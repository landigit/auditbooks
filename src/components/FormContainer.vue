<template>
  <div class="flex bg-gray-25 dark:bg-gray-875 overflow-x-hidden">
    <div class="flex flex-1 flex-col">
      <!-- Page Header (Title, Buttons, etc) -->
      <PageHeader
        v-if="showHeader"
        :title="title"
        :border="true"
        :searchborder="searchborder"
      >
        <template #left>
          <slot name="header-left" />
        </template>
        <slot name="header" />
      </PageHeader>

      <!-- Common Form -->
      <div
        class="flex flex-col self-center h-full overflow-auto bg-white dark:bg-gray-890 form-card-shadow"
        :class="
          isFullWidth
            ? 'w-full'
            : 'w-form border-x border-b dark:border-gray-800 rounded-b-lg shadow-lg mb-4 mx-4'
        "
      >
        <slot name="body" />
      </div>
    </div>

    <!-- Invoice Quick Edit -->
    <slot name="quickedit" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from './PageHeader.vue';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const props = withDefaults(
  defineProps<{
    title?: string;
    useFullWidth?: boolean;
    showHeader?: boolean;
    searchborder?: boolean;
  }>(),
  {
    title: '',
    useFullWidth: false,
    showHeader: true,
    searchborder: true,
  }
);

const { isMobile } = useBreakpoint();

const isFullWidth = computed(() => props.useFullWidth || isMobile.value);
</script>

<style scoped>
.form-card-shadow {
  border-color: #E2E2E2;
}
</style>
