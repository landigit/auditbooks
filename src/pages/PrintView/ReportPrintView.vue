<template>
  <div class="flex flex-col w-full h-full">
    <PageHeader :title="t`Print ${title}`">
      <Button class="text-xs" type="primary" @click="savePDF()">
        <feather-icon name="file-text" class="w-4 h-4 me-1.5" />
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @click="savePDF(true)">
        <feather-icon name="printer" class="w-4 h-4 me-1.5" />
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <div
      class="outer-container overflow-y-auto custom-scroll custom-scroll-thumb1"
    >
      <!-- Report Print Display Area -->
      <div
        class="p-4 bg-gray-25 dark:bg-gray-890 overflow-auto flex justify-center custom-scroll custom-scroll-thumb1"
      >
        <!-- Report Print Display Container -->
        <ScaledContainer
          ref="scaledContainer"
          class="shadow-lg border bg-white"
          :scale="scale"
          :width="size.width"
          :height="size.height"
          :show-overflow="true"
        >
          <div class="bg-white mx-auto">
            <div class="p-2">
              <div class="font-semibold text-xl w-full flex justify-between">
                <h1>
                  {{ `${fyo.singles.PrintSettings?.companyName}` }}
                </h1>
                <p class="text-gray-600">
                  {{ title }}
                </p>
              </div>
            </div>

            <!-- Report Data -->
            <div class="grid" :style="rowStyles">
              <template v-for="(row, r) of matrix" :key="`row-${r}`">
                <div
                  v-for="(cell, c) of row"
                  :key="`cell-${r}.${c}`"
                  :class="cellClasses(cell.idx, r)"
                  class="text-sm p-2"
                  style="min-height: 2rem"
                >
                  {{ cell.value }}
                </div>
              </template>
            </div>

            <div class="border-t p-2">
              <p class="text-xs text-right w-full">
                {{ fyo.format(new Date(), 'Datetime') }}
              </p>
            </div>
          </div>
        </ScaledContainer>
      </div>

      <!-- Report Print Settings -->
      <div v-if="report" class="border-l dark:border-gray-800 flex flex-col">
        <p class="p-4 text-sm text-gray-600 dark:text-gray-400">
          {{
            [
              t`Hidden values will be visible on Print on.`,
              t`Report will use more than one page if required.`,
            ].join(' ')
          }}
        </p>
        <!-- Row Selection -->
        <div class="p-4 border-t dark:border-gray-800">
          <Int
            :show-label="true"
            :border="true"
            :df="{
              label: t`Start From Row Index`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 1,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="start"
            @change="(v) => (start = v)"
          />
          <Int
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Number of Rows`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 0,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="limit"
            @change="(v) => (limit = v)"
          />
        </div>

        <!-- Size Selection -->
        <div class="border-t dark:border-gray-800 p-4">
          <Select
            :show-label="true"
            :border="true"
            :df="printSizeDf"
            :value="printSize"
            @change="(v) => (printSize = v)"
          />
          <Check
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Is Landscape`,
              fieldname: 'isLandscape',
              fieldtype: 'Check',
            }"
            :value="isLandscape"
            @change="(v) => (isLandscape = v)"
          />
        </div>

        <!-- Pick Columns -->
        <div class="border-t dark:border-gray-800 p-4">
          <h2 class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Pick Columns` }}
          </h2>
          <div
            class="border dark:border-gray-800 rounded grid grid-cols-2 mt-1"
          >
            <Check
              v-for="(col, i) of report?.columns"
              :key="col.fieldname"
              :show-label="true"
              :df="{
                label: col.label,
                fieldname: col.fieldname,
                fieldtype: 'Check',
              }"
              :value="columnSelection[i]"
              @change="(v) => (columnSelection[i] = v)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Verb } from 'fyo/telemetry/types';
import { Report } from 'reports/Report';
import { reports } from 'reports/index';
import { OptionField } from 'schemas/types';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Int from 'src/components/Controls/Int.vue';
import Select from 'src/components/Controls/Select.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ScaledContainer from 'src/pages/TemplateBuilder/ScaledContainer.vue';
import { useApp } from 'src/composables/useApp';
import { getReport } from 'src/utils/misc';
import { getPathAndMakePDF } from 'src/utils/printTemplates';
import { showSidebar } from 'src/utils/refs';
import { paperSizeMap, printSizes } from 'src/utils/ui';

const props = defineProps<{
  reportName: keyof typeof reports;
}>();

const { t, fyo } = useApp();

const start = ref(1);
const limit = ref(0);
const printSize = ref<(typeof printSizes)[number]>('A4');
const isLandscape = ref(false);
const scale = ref(0.65);
const report = ref<null | Report>(null);
const columnSelection = ref<boolean[]>([]);
const scaledContainer = ref<any>(null);

const title = computed<string>(() => {
  return reports[props.reportName]?.title ?? t`Report`;
});

const printSizeDf = computed<OptionField>(() => {
  return {
    label: 'Print Size',
    fieldname: 'printSize',
    fieldtype: 'Select',
    options: printSizes
      .filter((p) => p !== 'Custom')
      .map((name) => ({ value: name, label: name })),
  };
});

const matrix = computed<{ value: string; idx: number }[][]>(() => {
  if (!report.value) {
    return [];
  }

  const columns = report.value.columns
    .map((col, idx) => ({ value: col.label, idx }))
    .filter((_, i) => columnSelection.value[i]);

  const mat: { value: string; idx: number }[][] = [columns];
  const startVal = Math.max(start.value - 1, 0);
  const endVal = Math.min(startVal + limit.value, report.value.reportData.length);
  const slice = report.value.reportData.slice(startVal, endVal);

  for (let i = 0; i < slice.length; i++) {
    const row = slice[i];
    mat.push([]);
    for (let j = 0; j < row.cells.length; j++) {
      if (!columnSelection.value[j]) {
        continue;
      }

      const value = row.cells[j].value;
      mat.at(-1)?.push({ value, idx: Number(j) });
    }
  }

  return mat;
});

const rowStyles = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  const numColumns = columnSelection.value.filter(Boolean).length;
  style['grid-template-columns'] = `repeat(${numColumns}, minmax(0, auto))`;
  return style;
});

const size = computed<{ width: number; height: number }>(() => {
  const s = paperSizeMap[printSize.value];
  const long = s.width > s.height ? s.width : s.height;
  const short = s.width <= s.height ? s.width : s.height;

  if (isLandscape.value) {
    return { width: long, height: short };
  }

  return { width: short, height: long };
});

watch(size, () => {
  setScale();
});

onMounted(async () => {
  report.value = await getReport(props.reportName);
  limit.value = report.value.reportData.length;
  columnSelection.value = report.value.columns.map(() => true);
  setScale();

  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.rpv = {
      start,
      limit,
      printSize,
      isLandscape,
      scale,
      report,
      columnSelection,
      scaledContainer,
      title,
      printSizeDf,
      matrix,
      rowStyles,
      size,
      setScale,
      savePDF,
      cellClasses,
    };
  }
});

function setScale() {
  const width = size.value.width * 37.2;
  let containerWidth = window.innerWidth - 26 * 16;
  if (showSidebar.value) {
    containerWidth -= 12 * 16;
  }

  scale.value = Math.min(containerWidth / width, 1);
}

async function savePDF(shouldPrint?: boolean): Promise<void> {
  const innerHTML = scaledContainer.value?.$el?.children?.[0]?.innerHTML;
  if (typeof innerHTML !== 'string') {
    return;
  }

  const name = title.value + ' - ' + fyo.format(new Date(), 'Date');
  await getPathAndMakePDF(
    name,
    innerHTML,
    size.value.width,
    size.value.height,
    shouldPrint
  );

  fyo.telemetry.log(Verb.Printed, report.value!.reportName);
}

function cellClasses(cIdx: number, rIdx: number): string[] {
  const classes: string[] = [];
  if (!report.value) {
    return classes;
  }

  const col = report.value.columns[cIdx];
  const isFirst = cIdx === 0;
  if (col.align) {
    classes.push(`text-${col.align}`);
  }

  if (rIdx === 0) {
    classes.push('font-semibold');
  }

  classes.push('border-t');
  if (!isFirst) {
    classes.push('border-l');
  }

  return classes;
}
</script>

<style scoped>
.outer-container {
  display: grid;
  grid-template-columns: auto var(--w-quick-edit);
  @apply h-full overflow-auto;
}
</style>
