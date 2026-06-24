<template>
  <div class="overflow-hidden flex flex-col h-full">
    <!-- Report Outer Container -->
    <div v-if="dataSlice.length" class="overflow-hidden">
      <!--Title Row -->
      <div
        ref="titlerow"
        class="w-full overflow-x-hidden flex items-center dark:text-gray-25 border-b dark:border-gray-800 px-4 report-header-row"
        :style="{
          height: `${hconst}px`,
          paddingRight: 'calc(var(--w-scrollbar) + 1rem)',
        }"
      >
        <div
          v-for="(col, c) in report.columns"
          :key="c + '-col'"
          :style="getCellStyle(col, c as number)"
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
              r !== pageEnd - 1 ? 'border-b dark:border-gray-800' : '',
              row.isGroup
                ? 'hover:bg-gray-50 dark:hover:bg-gray-890 cursor-pointer'
                : '',
            ]"
            @click="() => onRowClick(row, r as number)"
          >
            <!-- Report Cell -->
            <div
              v-for="(cell, c) in row.cells"
              :key="`${c}-${r}-cell`"
              :style="getCellStyle(cell, c as number)"
              class="text-base px-3 flex-shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar flex items-center"
              :class="[
                getCellColorClass(cell),
                cell.align === 'right' ||
                (!cell.align &&
                  isNumeric(report.columns?.[c as number]?.fieldtype))
                  ? 'justify-end'
                  : 'justify-start',
              ]"
            >
              <feather-icon
                v-if="isGroupCell(row, c as number)"
                :name="row.foldedBelow ? 'chevron-right' : 'chevron-down'"
                class="w-4 h-4 me-1 flex-shrink-0"
              />
              <span>{{ cell.value }}</span>
            </div>
          </div>
        </template>
      </WithScroll>
      <!-- Report Rows Container -->
    </div>
    <p
      v-else
      class="w-full text-center mt-20 text-gray-800 dark:text-gray-100 text-base"
    >
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
import { Report } from 'reports/Report';
import { isNumeric as checkIsNumeric } from 'src/utils';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import Paginator from '../Paginator.vue';
import WithScroll from '../WithScroll.vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

const props = defineProps<{
  report: any;
}>();

const languageDirection = inject(languageDirectionKey);

const wconst = ref(6);
const hconst = ref(48);
const pageStart = ref(0);
const pageEnd = ref(0);

const titlerow = ref<HTMLElement | null>(null);

const dataSlice = computed(() => {
  if (props.report?.usePagination) {
    return props.report.reportData.slice(pageStart.value, pageEnd.value);
  }
  return props.report.reportData;
});

function isGroupCell(row: any, c: number) {
  if (!row.isGroup) return false;
  const firstColLabel = props.report?.columns?.[0]?.label;
  if (firstColLabel === '#') {
    return c === 1;
  }
  return c === 0;
}

function isNumeric(fieldtype: any) {
  return checkIsNumeric(fieldtype);
}

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

  while (row && (row.level ?? 0) > (clickedRow.level ?? 0)) {
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
    align = 'right';
  }

  const labelLength = props.report?.columns?.[i]?.label?.length ?? 0;
  let colWidth = width * wconst.value;
  if (labelLength > 0) {
    const minWidthForLabel = labelLength * 0.65;
    if (colWidth < minWidthForLabel) {
      colWidth = minWidthForLabel;
    }
  }

  styles['width'] = `${colWidth}rem`;
  styles['text-align'] = align;

  if (cell.bold) {
    styles['font-weight'] = 'bold';
  }

  if (cell.italics) {
    styles['font-style'] = 'oblique 15deg';
  }

  if (!cell.align && isNumeric(props.report.columns?.[i]?.fieldtype)) {
    styles['text-align'] = 'right';
  }

  const column = props.report?.columns?.[i];
  const columnLabel = column?.label;
  const fieldname = column?.fieldname;

  if (fieldname === 'index' || fieldname === 'name' || columnLabel === '#') {
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = '0px';
    } else {
      styles['padding-left'] = '0px';
    }
    styles['width'] = '3rem';
  } else if (fieldname === 'account' || columnLabel === 'Account') {
    styles['width'] = '20rem';
    if (i === 0) {
      if (languageDirection?.value === 'rtl') {
        styles['padding-right'] = '0px';
      } else {
        styles['padding-left'] = '0px';
      }
    }
  } else if (fieldname === 'referenceType' || columnLabel === 'Ref Type') {
    styles['width'] = '12rem';
  } else if (fieldname === 'party' || columnLabel === 'Party') {
    styles['width'] = '12rem';
  } else if (fieldname === 'referenceName' || columnLabel === 'Ref Name') {
    styles['width'] = '10rem';
  } else if (i === 0) {
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = '0px';
    } else {
      styles['padding-left'] = '0px';
    }
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
    return 'text-red-600';
  } else if (cell.color === 'green') {
    return 'text-green-600';
  }

  if (!cell.rawValue) {
    return 'text-gray-600 dark:text-gray-400';
  }

  if (typeof cell.rawValue !== 'number') {
    return 'text-gray-900 dark:text-gray-100';
  }

  if (cell.rawValue === 0) {
    return 'text-gray-600 dark:text-gray-400';
  }

  const prec = fyo?.singles?.displayPrecision ?? 2;
  if (Number(cell.rawValue.toFixed(prec)) === 0) {
    return 'text-gray-600 dark:text-gray-500';
  }

  return 'text-gray-900 dark:text-gray-300';
}
</script>
