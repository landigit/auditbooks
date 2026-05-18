<template>
  <div
    class="grid grid-cols-3 text-main text-sm select-none items-center"
    style="height: 50px"
  >
    <!-- Length Display -->
    <div class="justify-self-start">
      {{
        `${(pageNo - 1) * count + 1} - ${Math.min(pageNo * count, itemCount)}`
      }}
    </div>

    <!-- Pagination Selector -->
    <div class="flex gap-1 items-center justify-self-center">
      <LucideIcon
        name="chevron-left"
        class="w-4 h-4 rtl-rotate-180"
        :class="
          pageNo > 1 ? 'text-description cursor-pointer' : 'text-transparent'
        "
        @click="() => setPageNo(Math.max(1, pageNo - 1))"
      />
      <div class="flex gap-1 bg-canvas-muted rounded">
        <input
          type="number"
          class="w-7 text-end outline-none bg-transparent focus:text-main"
          :value="pageNo"
          min="1"
          :max="maxPages"
          @change="
            (e: Event) => setPageNo((e.target as HTMLInputElement).value)
          "
          @input="(e: Event) => setPageNo((e.target as HTMLInputElement).value)"
        />
        <p class="text-description">/</p>
        <p class="w-7">
          {{ maxPages }}
        </p>
      </div>
      <LucideIcon
        name="chevron-right"
        class="w-4 h-4 rtl-rotate-180"
        :class="
          pageNo < maxPages
            ? 'text-description cursor-pointer'
            : 'text-transparent'
        "
        @click="() => setPageNo(Math.min(maxPages, pageNo + 1))"
      />
    </div>

    <!-- Count Selector -->
    <div
      v-if="filteredCounts.length"
      class="border border-border rounded flex justify-self-end"
    >
      <template v-for="c in filteredCounts" :key="c + '-count'">
        <button
          class="w-9"
          :class="
            count === c || (count === itemCount && c === -1)
              ? 'rounded bg-surface-hover'
              : ''
          "
          @click="setCount(c)"
        >
          {{ c === -1 ? t`All` : c }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, onMounted } from 'vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import { t } from 'fyo';

// --- Props & Emits ---
const props = withDefaults(
  defineProps<{
    itemCount?: number;
    allowedCounts?: number[];
  }>(),
  {
    itemCount: 0,
    allowedCounts: () => [50, 100, 500, -1],
  }
);

const emit = defineEmits<{
  (e: 'index-change', indices: { start: number; end: number }): void;
}>();

// --- State ---
const pageNo = ref(1);
const count = ref(0);

// --- Computed ---
const maxPages = computed(() => {
  if (count.value === 0) return 1;
  return Math.max(1, Math.ceil(props.itemCount / count.value));
});

const filteredCounts = computed(() => {
  return props.allowedCounts.filter(filterCount);
});

// --- Lifecycle ---
onMounted(() => {
  count.value = props.allowedCounts[0];
  emitIndices();
});

// --- Methods ---
function filterCount(c: number) {
  if (c !== -1 && props.itemCount < c) {
    return false;
  }

  if (c === -1 && props.itemCount < props.allowedCounts[0]) {
    return false;
  }

  return true;
}

function setPageNo(value: string | number) {
  let parsedValue = typeof value === 'string' ? parseInt(value) : value;

  if (isNaN(parsedValue)) {
    return;
  }

  pageNo.value = Math.min(Math.max(1, parsedValue), maxPages.value);
  emitIndices();
}

function setCount(c: number) {
  pageNo.value = 1;
  if (c === -1) {
    count.value = props.itemCount;
  } else {
    count.value = c;
  }
  emitIndices();
}

function emitIndices() {
  const indices = getSliceIndices();
  emit('index-change', indices);
}

function getSliceIndices() {
  const start = (pageNo.value - 1) * count.value;
  const end = pageNo.value * count.value;
  return { start, end };
}
</script>
