<template>
  <view
    class="flex bg-canvas overflow-x-auto custom-scroll custom-scroll-thumb1"
  >
    <view class="flex flex-1 flex-col">
      <!-- Page Header (Title, Buttons, etc) -->
      <PageHeader
        v-if="showHeader"
        :title="title"
        :border="false"
        :searchborder="searchborder"
      >
        <template #left>
          <slot name="header-left" />
        </template>
        <slot name="header" />
      </PageHeader>

      <!-- Common Form -->
      <view
        class="flex flex-col self-center h-full overflow-auto bg-surface window-no-drag"
        :class="
          useFullWidth
            ? 'w-full border-t border-border'
            : 'w-full md:w-[var(--w-form)] border-0 md:border border-border rounded-none md:rounded-lg shadow-none md:shadow-lg mb-0 mx-0 md:mb-4 md:mx-4'
        "
      >
        <slot name="body" />
      </view>
    </view>

    <!-- Invoice Quick Edit -->
    <slot name="quickedit" />
  </view>
</template>

<script setup lang="ts">
import PageHeader from './PageHeader.vue';

// Define Props directly without variable assignment (prevent TS6133)
withDefaults(
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
</script>
