<template>
  <view
    class="gap-4 py-2 w-full flex flex-col items-center rounded-t-md text-main overflow-y-auto custom-scroll custom-scroll-thumb2"
    style="height: 83vh"
  >
    <!-- Items Grid -->
    <view
      class="gap-2 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <view
        class="p-1 border border-border flex flex-col text-sm text-center"
        @tap="handleChange(item as POSItem)"
        v-for="item in items as POSItem[]"
        :key="item.name"
        v-memo="[item.name, item.image, item.availableQty, item.rate]"
      >
        <view class="self-center w-32 h-32 p-1 rounded-lg">
          <view class="relative w-full h-full p-2">
            <img
              v-if="item.image"
              :src="item.image"
              alt=""
              class="rounded-lg w-full h-full object-cover"
            />

            <view
              v-else
              class="rounded-lg w-full h-full bg-canvas-muted flex justify-center items-center"
            >
              <text class="text-4xl font-semibold text-description select-none">
                {{ getExtractedWords(item.name) }}
              </text>
            </view>
            <text
              v-if="itemVisibility !== 'ERP Sync Items'"
              class="absolute top-1 right-1 rounded-full w-6 h-6 flex justify-center items-center"
              :class="
                item.availableQty > 0
                  ? 'bg-indicator-green-bg text-indicator-green-text'
                  : 'bg-indicator-red-bg text-indicator-red-text'
              "
            >
              {{ item.availableQty }}
            </text>
          </view>
        </view>
        <text class="text-lg font-medium text-main">{{ item.name }}</text>

        <text class="text-lg font-medium text-main">
          {{
            item.rate ? fyo.currencySymbols[item.rate.getCurrency()] : undefined
          }}
          {{ item.rate }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { fyo } from 'src/initFyo';
import { POSItem, ItemQtyMap } from '../types';

// Define Props
withDefaults(
  defineProps<{
    items?: unknown[];
    itemQtyMap?: ItemQtyMap;
    itemVisibility?: string;
  }>(),
  {
    items: () => [],
    itemQtyMap: () => ({}),
    itemVisibility: 'Inventory Items',
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'addItem', value: POSItem): void;
  (e: 'updateValues'): void;
}>();

// Helper Methods
const getExtractedWords = (item: string) => {
  const initials = item.split(' ').map((word) => {
    return word[0]?.toUpperCase() || '';
  });
  return initials.join('');
};

const handleChange = (value: POSItem) => {
  emit('addItem', value);
  emit('updateValues');
};
</script>
