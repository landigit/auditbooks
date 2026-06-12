<template>
  <div
    class="grid grid-cols-3 text-gray-800 dark:text-gray-100 text-sm select-none items-center"
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
      <feather-icon
        name="chevron-left"
        class="w-4 h-4 rtl-rotate-180"
        :class="
          pageNo > 1
            ? 'text-gray-600 dark:text-gray-500 cursor-pointer'
            : 'text-transparent'
        "
        @click="() => setPageNo(Math.max(1, pageNo - 1))"
      />
      <div class="flex gap-1 bg-gray-100 dark:bg-gray-890 rounded">
        <input
          type="number"
          class="w-7 text-end outline-none bg-transparent focus:text-gray-900 dark:focus:text-gray-25"
          :value="pageNo"
          min="1"
          :max="maxPages"
          @change="handlePageInput"
          @input="handlePageInput"
        />
        <p class="text-gray-600">/</p>
        <p class="w-7">
          {{ maxPages }}
        </p>
      </div>
      <feather-icon
        name="chevron-right"
        class="w-4 h-4 rtl-rotate-180"
        :class="
          pageNo < maxPages
            ? 'text-gray-600 dark:text-gray-500 cursor-pointer'
            : 'text-transparent'
        "
        @click="() => setPageNo(Math.min(maxPages, pageNo + 1))"
      />
    </div>

    <!-- Count Selector -->
    <div
      v-if="filteredCounts.length"
      class="border border-gray-100 dark:border-gray-800 rounded flex justify-self-end"
    >
      <template v-for="c in filteredCounts" :key="c + '-count'">
        <button
          class="w-9"
          :class="
            count === c || (count === itemCount && c === -1)
              ? 'rounded bg-gray-100 dark:bg-gray-890'
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
import { ref, computed, onMounted } from 'vue';
import { useApp } from 'src/composables/useApp';

const { t } = useApp();

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

const pageNo = ref(1);
const count = ref(0);

const maxPages = computed(() => {
  return Math.ceil(props.itemCount / count.value) || 1;
});

const filteredCounts = computed(() => {
  return props.allowedCounts.filter(filterCount);
});

onMounted(() => {
  count.value = props.allowedCounts[0] || 50;
  emitIndices();
});

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
  const val = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(val)) {
    return;
  }
  pageNo.value = Math.min(Math.max(1, val), maxPages.value);
  emitIndices();
}

function handlePageInput(e: Event) {
  setPageNo((e.target as HTMLInputElement).value);
}

function setCount(c: number) {
  pageNo.value = 1;
  let nextCount = c;
  if (c === -1) {
    nextCount = props.itemCount;
  }
  count.value = nextCount;
  emitIndices();
}

function emitIndices() {
  const start = (pageNo.value - 1) * count.value;
  const end = pageNo.value * count.value;
  emit('index-change', { start, end });
}
</script>
