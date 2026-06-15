<template>
  <div
    class="flex flex-row flex-nowrap items-center gap-4 text-foreground text-sm select-none min-h-[50px] py-2 w-full"
    :class="
      props.hideCountSelector ? 'justify-center gap-6' : 'justify-between'
    "
  >
    <!-- Left Section: Length Display & Count Selector Unified -->
    <div
      :class="
        props.hideCountSelector
          ? 'flex-shrink-0 flex items-center'
          : 'flex-1 flex justify-start min-w-[280px]'
      "
    >
      <div
        class="border border-gray-200 dark:border-gray-800 bg-background rounded-md flex items-center px-3 h-8 shadow-sm text-sm gap-3"
      >
        <span class="text-muted-foreground font-medium whitespace-nowrap">
          {{
            `${(pageNo - 1) * count + 1} - ${Math.min(pageNo * count, itemCount)}`
          }}
          <span class="text-xs text-muted-foreground/60 ms-1">
            {{ t`of` }} {{ itemCount }}
          </span>
        </span>
        <template v-if="filteredCounts.length && !props.hideCountSelector">
          <div class="h-4 w-[1px] bg-gray-200 dark:bg-gray-800"></div>
          <div class="flex items-center gap-0.5">
            <button
              v-for="c in filteredCounts"
              :key="c + '-count'"
              class="h-6 px-2.5 text-xs font-semibold rounded transition-all duration-150"
              :class="
                count === c || (count === itemCount && c === -1)
                  ? 'bg-gray-100 dark:bg-gray-890 text-foreground'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-gray-55 dark:hover:bg-gray-800'
              "
              @click="setCount(c)"
            >
              {{ c === -1 ? t`All` : c }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Pagination Selector -->
    <div class="flex-shrink-0 flex gap-2 items-center justify-center">
      <button
        class="w-8 h-8 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-800 bg-background text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 shadow-sm disabled:opacity-40 disabled:hover:bg-background disabled:hover:text-foreground disabled:cursor-not-allowed"
        :disabled="pageNo <= 1"
        :title="t`Previous Page`"
        @click="() => setPageNo(Math.max(1, pageNo - 1))"
      >
        <feather-icon name="chevron-left" class="w-4 h-4 rtl-rotate-180" />
      </button>
      <div
        class="flex items-center gap-1.5 px-2.5 h-8 border border-gray-200 dark:border-gray-800 bg-background rounded-md text-sm shadow-sm"
      >
        <input
          type="number"
          class="w-6 text-center outline-none bg-transparent focus:text-foreground font-semibold border-b border-transparent focus:border-primary transition-colors duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          :value="pageNo"
          min="1"
          :max="maxPages"
          @change="handlePageInput"
          @input="handlePageInput"
        />
        <span class="text-muted-foreground">/</span>
        <span
          class="text-foreground font-semibold min-w-[1.25rem] text-center"
          >{{ maxPages }}</span
        >
      </div>
      <button
        class="w-8 h-8 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-800 bg-background text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 shadow-sm disabled:opacity-40 disabled:hover:bg-background disabled:hover:text-foreground disabled:cursor-not-allowed"
        :disabled="pageNo >= maxPages"
        :title="t`Next Page`"
        @click="() => setPageNo(Math.min(maxPages, pageNo + 1))"
      >
        <feather-icon name="chevron-right" class="w-4 h-4 rtl-rotate-180" />
      </button>
    </div>

    <!-- Empty third column to maintain center alignment of page controls -->
    <div
      v-if="!props.hideCountSelector"
      class="flex-1 justify-end hidden md:flex min-w-[280px]"
    ></div>
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
    hideDetails?: boolean;
  }>(),
  {
    itemCount: 0,
    allowedCounts: () => [50, 100, 500, -1],
    hideDetails: false,
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
