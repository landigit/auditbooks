<template>
  <view v-if="!isLynx">
    <view :class="level > 0 ? 'ms-2 ps-2 border-l border-border' : ''">
      <template v-for="r of rows" :key="r.key">
        <view
          class="flex gap-2 text-sm text-description whitespace-nowrap overflow-auto no-scrollbar"
          :class="[typeof r.value === 'object' ? 'cursor-pointer' : '']"
          @tap="r.collapsed = !r.collapsed"
        >
          <view class="">{{ getKey(r) }}</view>
          <view v-if="!r.isCollapsible" class="font-semibold text-muted">
            {{ r.value }}
          </view>
          <view
            v-else-if="Array.isArray(r.value)"
            class="text-indicator-blue-text bg-indicator-blue-bg border-indicator-blue-text border tracking-tighter rounded text-xs px-1"
          >
            Array
          </view>
          <view
            v-else
            class="text-chart-pink-main bg-indicator-orange-bg border-chart-pink-main border tracking-tighter rounded text-xs px-1"
          >
            Object
          </view>

          <lucide-icon
            v-if="r.isCollapsible"
            :name="r.collapsed ? 'chevron-up' : 'chevron-down'"
            class="w-4 h-4 ms-auto"
          />
        </view>
        <view v-if="!r.collapsed && typeof r.value === 'object'">
          <TemplateBuilderHint
            :prefix="getKey(r)"
            :hints="Array.isArray(r.value) ? r.value[0] : r.value"
            :level="level + 1"
          />
        </view>
      </template>
    </view>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Template Builder Hint</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { PrintTemplateHint } from "src/utils/printTemplates";

type HintRow = {
  key: string;
  value: PrintTemplateHint[string];
  isCollapsible: boolean;
  collapsed: boolean;
};

// Define Props
const props = withDefaults(
  defineProps<{
    prefix?: string;
    hints: PrintTemplateHint;
    level?: number;
  }>(),
  {
    prefix: "",
    level: 0,
  },
);

// Reactive State
const rows = ref<HintRow[]>([]);

// Methods
const getKey = (row: HintRow) => {
  const isArray = Array.isArray(row.value);
  if (isArray) {
    return `${props.prefix}.${row.key}[number]`;
  }

  if (props.prefix.length) {
    return `${props.prefix}.${row.key}`;
  }

  return row.key;
};

// Lifecycles
onMounted(() => {
  rows.value = Object.entries(props.hints)
    .map(([key, value]) => ({
      key,
      value,
      isCollapsible: typeof value === "object",
      collapsed: props.level > 0,
    }))
    .sort((a, b) => Number(a.isCollapsible) - Number(b.isCollapsible));
});
</script>
