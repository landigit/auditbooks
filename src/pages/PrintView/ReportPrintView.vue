<template>
  <view class="flex flex-col w-full h-full">
    <PageHeader :title="t`Print ${title}`">
      <DropdownWithActions :actions="printActions" />
    </PageHeader>

    <view
      class="outer-container overflow-y-auto custom-scroll custom-scroll-thumb1"
    >
      <!-- Report Print Display Area -->
      <view
        class="p-4 bg-canvas-muted overflow-auto flex justify-center custom-scroll custom-scroll-thumb1"
      >
        <!-- Report Print Display Container -->
        <ScaledContainer
          ref="scaledContainer"
          class="shadow-lg border border-border bg-surface"
          :scale="scale"
          :width="size.width"
          :height="size.height"
          :show-overflow="true"
        >
          <view class="bg-surface mx-auto">
            <view class="p-2">
              <view class="font-semibold text-xl w-full flex justify-between">
                <text>
                  {{ `${fyo.singles.PrintSettings?.companyName}` }}
                </text>
                <text class="text-description">
                  {{ title }}
                </text>
              </view>
            </view>

            <!-- Report Data -->
            <view class="grid" :style="rowStyles">
              <template v-for="(row, r) of matrix" :key="`row-${r}`">
                <view
                  v-for="(cell, c) of row"
                  :key="`cell-${r}.${c}`"
                  :class="cellClasses(cell.idx, r)"
                  class="text-sm p-2"
                  style="min-height: 2rem"
                >
                  <text>{{ cell.value }}</text>
                </view>
              </template>
            </view>

            <view class="border-t p-2">
              <text class="text-xs text-right w-full">
                {{ fyo.format(new Date(), 'Datetime') }}
              </text>
            </view>
          </view>
        </ScaledContainer>
      </view>

      <!-- Report Print Settings -->
      <view v-if="report" class="border-l border-border flex flex-col">
        <text class="p-4 text-sm text-description">
          {{
            [
              t`Hidden values will be visible on Print on.`,
              t`Report will use more than one page if required.`,
            ].join(' ')
          }}
        </text>
        <!-- Row Selection -->
        <view class="p-4 border-t border-border">
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
        </view>

        <!-- Size Selection -->
        <view class="border-t border-border p-4">
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
        </view>

        <!-- Pick Columns -->
        <view class="border-t border-border p-4">
          <text class="text-sm text-description">
            {{ t`Pick Columns` }}
          </text>
          <view class="border border-border rounded grid grid-cols-2 mt-1">
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
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { Verb } from 'fyo/telemetry/types';
import { Report } from 'reports/Report';
import { reports } from 'reports/index';
import { OptionField } from 'schemas/types';
import Check from 'src/components/Controls/Check.vue';
import Int from 'src/components/Controls/Int.vue';
import Select from 'src/components/Controls/Select.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { getReport } from 'src/utils/misc';
import { getPathAndMakePDF } from 'src/utils/printTemplates';
import { useAppStore } from 'src/stores/app';
import { paperSizeMap, printSizes } from 'src/utils/ui';
import ScaledContainer from '../TemplateBuilder/ScaledContainer.vue';

// Define Props
const props = defineProps<{
  reportName: keyof typeof reports;
}>();

// App Store
const store = useAppStore();

// Template Refs
const scaledContainer = ref<InstanceType<typeof ScaledContainer> | null>(null);

// Reactive State
const start = ref(1);
const limit = ref(0);
const printSize = ref('A4');
const isLandscape = ref(false);
const scale = ref(0.65);
const report = ref<null | Report>(null);
const columnSelection = ref<boolean[]>([]);

// Computed Properties
const title = computed(() => {
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

const matrix = computed(() => {
  if (!report.value) {
    return [];
  }

  const columns = report.value.columns
    .map((col, idx) => ({ value: col.label, idx }))
    .filter((_, i) => columnSelection.value[i]);

  const mat: { value: string; idx: number }[][] = [columns];
  const startVal = Math.max(start.value - 1, 0);
  const endVal = Math.min(
    startVal + limit.value,
    report.value.reportData.length
  );
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
  const paper = paperSizeMap[printSize.value as keyof typeof paperSizeMap];
  const long = paper.width > paper.height ? paper.width : paper.height;
  const short = paper.width <= paper.height ? paper.width : paper.height;

  if (isLandscape.value) {
    return { width: long, height: short };
  }

  return { width: short, height: long };
});

// Methods
const setScale = () => {
  const widthVal = size.value.width * 37.2;
  let containerWidth = 1024;
  if (typeof window !== 'undefined') {
    containerWidth = window.innerWidth - 26 * 16;
  } else if (typeof SystemInfo !== 'undefined') {
    containerWidth = SystemInfo.pixelWidth / SystemInfo.pixelRatio - 26 * 16;
  }
  if (store.showSidebar) {
    containerWidth -= 12 * 16;
  }

  scale.value = Math.min(containerWidth / widthVal, 1);
};

const savePDF = async (shouldPrint?: boolean) => {
  const innerHTML = scaledContainer.value?.$el.children[0].innerHTML;
  if (typeof innerHTML !== 'string') {
    return;
  }

  const name = title.value + ' - ' + fyo.format(new Date(), 'Date');
  await getPathAndMakePDF(
    name,
    innerHTML,
    size.value.width,
    size.value.height,
    undefined,
    shouldPrint
  );

  fyo.telemetry.log(Verb.Printed, report.value!.reportName);
};

const printActions = computed(() => {
  return [
    {
      label: t`Save as PDF`,
      action: () => savePDF(),
    },
    {
      label: t`Print`,
      action: () => savePDF(true),
    },
  ];
});

const cellClasses = (cIdx: number, rIdx: number): string[] => {
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

  classes.push('border-t border-border');
  if (!isFirst) {
    classes.push('border-l border-border');
  }

  return classes;
};

// Watchers
watch(size, () => {
  setScale();
});

// Lifecycles
onMounted(async () => {
  report.value = await getReport(props.reportName);
  limit.value = report.value.reportData.length;
  columnSelection.value = report.value.columns.map(() => true);
  setScale();

  if (store.isDevelopment && typeof window !== 'undefined') {
    // @ts-ignore
    window.rpv = {
      start,
      limit,
      printSize,
      isLandscape,
      scale,
      report,
      columnSelection,
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
</script>

<style scoped>
@reference "../../styles/index.css";
.outer-container {
  display: grid;
  grid-template-columns: auto var(--w-quick-edit);
  @apply h-full overflow-auto;
}
</style>
