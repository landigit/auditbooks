<template>
  <view
    class="flex flex-col items-center gap-4 my-3 px-4 py-2 rounded-t-md text-main w-full overflow-y-auto custom-scroll custom-scroll-thumb2"
    style="height: 80vh"
  >
    <!-- Items Grid -->
    <view
      class="gap-2 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7'"
    >
      <view
        class="pb-3 border border-border flex flex-col text-sm text-center"
        @tap="handleChange(item as POSItem)"
        v-for="item in items as POSItem[]"
        :key="item.name"
        v-memo="[item.name, item.image, item.availableQty, item.rate]"
      >
        <view class="self-center w-full h-32 lg:h-28 p-1 rounded-lg">
          <view class="relative w-auto h-full">
            <img
              v-if="item.image"
              :src="item.image"
              alt=""
              class="rounded-lg w-full h-full object-cover"
            />

            <view
              v-else
              class="rounded-lg bg-canvas-muted w-full h-full flex justify-center items-center"
            >
              <text class="text-4xl font-semibold text-description select-none">
                {{ getExtractedWords(item.name) }}
              </text>
            </view>
            <text
              v-if="itemVisibility !== 'ERP Sync Items'"
              class="w-6 h-6 top-1 right-1 absolute rounded-full flex justify-center items-center"
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
          {{ item.rate ? fyo.currencySymbols[item.rate.getCurrency()] : undefined }}
          {{ item.rate }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { fyo } from "src/initFyo";
import { POSItem, ItemQtyMap } from "../types";

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
    itemVisibility: "Inventory Items",
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "addItem", value: POSItem): void;
  (e: "updateValues"): void;
}>();

// Helper Methods
const getExtractedWords = (item: string) => {
  const initials = item.split(" ").map((word) => {
    return word[0]?.toUpperCase() || "";
  });
  return initials.join("");
};

const handleChange = (value: POSItem) => {
  emit("addItem", value);
  emit("updateValues");
};
</script>
