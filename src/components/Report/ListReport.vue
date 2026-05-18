<template>
  <div class="overflow-hidden flex flex-col h-full">
    <!-- Report Outer Container -->
    <div v-if="dataSlice.length" class="overflow-hidden">
      <!--Title Row -->
      <div
        ref="titlerow"
        class="w-full overflow-x-hidden flex items-center text-main border-b border-border px-4"
        :style="{
          height: `${hconst}px`,
          paddingRight: 'calc(var(--w-scrollbar) + 1rem)',
        }"
      >
        <div
          v-for="(col, c) in report.columns"
          :key="c + '-col'"
          :style="getCellStyle(col, c)"
          class="text-base px-3 flex-shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar"
        >
          {{ col.label }}
        </div>
      </div>

      <WithScroll
        class="overflow-auto w-full"
        style="height: calc(100% - 49px)"
        @scroll="scroll"
      >
        <!-- Report Rows -->
        <template v-for="(row, r) in dataSlice" :key="r + '-row'">
          <div
            v-if="!row.folded"
            class="flex items-center w-max px-4"
            :style="{
              height: `${hconst}px`,
              minWidth: `calc(var(--w-desk) - var(--w-scrollbar))`,
            }"
            :class="[
              r !== pageEnd - 1 ? 'border-b border-border' : '',
              row.isGroup ? 'hover:bg-surface-hover cursor-pointer' : '',
            ]"
            @click="() => onRowClick(row, r)"
          >
            <!-- Report Cell -->
            <div
              v-for="(cell, c) in row.cells"
              :key="`${c}-${r}-cell`"
              :style="getCellStyle(cell, c)"
              class="text-base px-3 flex-shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar"
              :class="[getCellColorClass(cell)]"
            >
              {{ cell.value }}
            </div>
          </div>
        </template>
      </WithScroll>
      <!-- Report Rows Container -->
    </div>
    <p v-else class="w-full text-center mt-20 text-description text-base">
      {{ report.loading ? t`Loading Report...` : t`No Values to be Displayed` }}
    </p>

    <!-- Pagination Footer -->
    <div v-if="report.usePagination" class="mt-auto flex-shrink-0">
      <Paginator
        :item-count="report?.reportData?.length ?? 0"
        class="px-4"
        @index-change="setPageIndices"
      />
    </div>
    <div v-else class="h-4" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { isNumeric } from 'src/utils';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import Paginator from '../Paginator.vue';
import WithScroll from '../WithScroll.vue';

const props = defineProps<{
  report: any;
}>();

const languageDirection = inject(languageDirectionKey);

const titlerow = ref<HTMLDivElement | null>(null);

const wconst = 8;
const hconst = 48;
const pageStart = ref(0);
const pageEnd = ref(0);

const dataSlice = computed(() => {
  if (props.report?.usePagination) {
    return props.report.reportData.slice(pageStart.value, pageEnd.value);
  }

  return props.report.reportData;
});

function scroll({ scrollLeft }: { scrollLeft: number }) {
  if (titlerow.value) {
    titlerow.value.scrollLeft = scrollLeft;
  }
}

function setPageIndices({ start, end }: { start: number; end: number }) {
  pageStart.value = start;
  pageEnd.value = end;
}

function onRowClick(clickedRow: any, r: number) {
  if (!clickedRow.isGroup) {
    return;
  }

  r += 1;
  clickedRow.foldedBelow = !clickedRow.foldedBelow;
  const folded = clickedRow.foldedBelow;
  let row = dataSlice.value[r];

  while (row && row.level > clickedRow.level) {
    row.folded = folded;
    r += 1;
    row = dataSlice.value[r];
  }
}

function getCellStyle(cell: any, i: number) {
  const styles: Record<string, string> = {};
  const width = cell.width ?? 1;

  let align = cell.align ?? 'left';
  if (languageDirection?.value === 'rtl') {
    align = languageDirection?.value === 'rtl' ? 'right' : 'left';
  }

  styles['width'] = `${width * wconst}rem`;
  styles['text-align'] = align;

  if (cell.bold) {
    styles['font-weight'] = 'bold';
  }

  if (cell.italics) {
    styles['font-style'] = 'oblique 15deg';
  }

  if (i === 0) {
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = '0px';
    } else {
      styles['padding-left'] = '0px';
    }
  }

  if (!cell.align && isNumeric(cell.fieldtype)) {
    styles['text-align'] = 'right';
  }

  if (i === props.report.columns.length - 1) {
    if (languageDirection?.value === 'rtl') {
      styles['padding-left'] = '0px';
    } else {
      styles['padding-right'] = '0px';
    }
  }

  if (cell.indent) {
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = `${cell.indent * 2}rem`;
    } else {
      styles['padding-left'] = `${cell.indent * 2}rem`;
    }
  }

  return styles;
}

function getCellColorClass(cell: any) {
  if (cell.color === 'red') {
    return 'text-error';
  } else if (cell.color === 'green') {
    return 'text-indicator-green-text';
  }

  if (!cell.rawValue) {
    return 'text-description';
  }

  if (typeof cell.rawValue !== 'number') {
    return 'text-main';
  }

  if (cell.rawValue === 0) {
    return 'text-description';
  }

  const prec = fyo?.singles?.displayPrecision ?? 2;
  if (Number(cell.rawValue.toFixed(prec)) === 0) {
    return 'text-description';
  }

  return 'text-main';
}
</script>
