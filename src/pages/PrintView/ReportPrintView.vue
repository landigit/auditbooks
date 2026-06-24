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
          class="shadow-lg border bg-white print-preview-paper"
          :scale="scale"
          :width="size.width"
          :height="size.height"
          :show-overflow="true"
        >
          <div
            class="bg-white mx-auto w-full min-h-full p-4 flex flex-col justify-between"
          >
            <div>
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
              <div class="grid w-full border-r border-b" :style="rowStyles">
                <template v-for="(row, r) of matrix" :key="`row-${r}`">
                  <div
                    v-for="(cell, c) of row"
                    :key="`cell-${r}.${c}`"
                    :class="cellClasses(cell.idx, r)"
                    class="text-sm p-2"
                    style="min-height: 2rem; word-break: break-all"
                  >
                    {{ cell.value }}
                  </div>
                </template>
              </div>
            </div>

            <div class="border-t p-2 mt-4">
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
            class="border dark:border-gray-800 rounded grid grid-cols-2 gap-2 mt-1"
            style="
              display: grid !important;
              height: auto !important;
              padding: 12px !important;
            "
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
import ScaledContainer from './ScaledContainer.vue';
import { useApp } from 'src/composables/useApp';
import { getReport } from 'src/utils/misc';
import { getPdfMake } from 'src/composables/usePdfInvoice';
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
  if (!report.value) return style;
  const cols = report.value.columns.filter((_, i) => columnSelection.value[i]);
  const template = cols.map((col) => `${col.width || 1}fr`).join(' ');
  style['grid-template-columns'] = template;
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
  try {
    const pdfMake = await getPdfMake();

    const columns = report.value?.columns || [];

    // Construct table headers and rows
    const tableBody: any[] = [];
    matrix.value.forEach((row, rIdx) => {
      const isHeader = rIdx === 0;
      const tableRow = row.map((cell) => {
        const col = columns[cell.idx];
        const alignment = col?.align || 'left';
        return {
          text: cell.value || '',
          bold: isHeader,
          fontSize: isHeader ? 8 : 7.5,
          alignment: alignment,
          fillColor: isHeader ? '#f3f4f6' : undefined,
        };
      });
      tableBody.push(tableRow);
    });

    // If there are no columns or data, return
    if (tableBody.length === 0 || tableBody[0].length === 0) {
      return;
    }

    // Map column widths dynamically based on the report's column widths and page width
    const selectedCols = matrix.value[0];
    const totalWeight = selectedCols.reduce((sum, cell) => {
      const col = columns[cell.idx];
      return sum + (col?.width || 1);
    }, 0);

    const pageSizeName = printSize.value;
    const isLand = isLandscape.value;
    const s = paperSizeMap[pageSizeName] || paperSizeMap.A4;
    const pageWidth = isLand
      ? Math.max(s.width, s.height)
      : Math.min(s.width, s.height);
    const pageHeight = isLand
      ? Math.min(s.width, s.height)
      : Math.max(s.width, s.height);
    const pageWidthPts = pageWidth * 28.346;
    const pageHeightPts = pageHeight * 28.346;

    const pageMarginLeftRight = 20;
    const printableWidth = pageWidthPts - pageMarginLeftRight * 2;

    const paddingPerCol = 10; // paddingLeft: 5, paddingRight: 5
    const borderWidth = 0.5; // vLineWidth: 0.5
    const totalPaddingAndBorders =
      selectedCols.length * paddingPerCol +
      (selectedCols.length + 1) * borderWidth;
    const availableContentWidth = Math.max(
      10,
      printableWidth - totalPaddingAndBorders
    );

    const tableWidths = selectedCols.map((cell) => {
      const col = columns[cell.idx];
      const colWeight = col?.width || 1;
      return (colWeight / totalWeight) * availableContentWidth;
    });

    const name = title.value + ' - ' + fyo.format(new Date(), 'Date');

    const docDefinition: any = {
      info: { title: name },
      pageSize:
        pageSizeName === 'POS'
          ? { width: pageWidthPts, height: pageHeightPts }
          : printSize.value,
      pageOrientation: isLandscape.value ? 'landscape' : 'portrait',
      pageMargins: [pageMarginLeftRight, 40, pageMarginLeftRight, 40],
      content: [
        {
          text: fyo.singles.PrintSettings?.companyName || '',
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 2],
        },
        {
          text: title.value || '',
          fontSize: 11,
          color: '#555',
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            widths: tableWidths,
            body: tableBody,
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: (i: number, node: any) =>
              i === 0 || i === node.table.widths.length ? 1 : 0.5,
            hLineColor: () => '#cccccc',
            vLineColor: () => '#e5e7eb',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
      ],
      footer: (currentPage: number, pageCount: number) => {
        return {
          columns: [
            {
              text: fyo.format(new Date(), 'Datetime'),
              fontSize: 7,
              color: '#777',
              margin: [20, 0, 0, 0],
            },
            {
              text: `Page ${currentPage} of ${pageCount}`,
              fontSize: 7,
              color: '#777',
              alignment: 'right',
              margin: [0, 0, 20, 0],
            },
          ],
        };
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    if (shouldPrint) {
      const pdfBuffer = await pdfMake.createPdf(docDefinition).getBuffer();
      const buffer = new Uint8Array(pdfBuffer);
      const { tempDir, join } = await import('@tauri-apps/api/path');
      const tempDirPath = await tempDir();
      const sanitizedName = name.replace(/[^a-zA-Z0-9-_ ]/g, '_') || 'report';
      const filePath = await join(tempDirPath, `${sanitizedName}.pdf`);
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(filePath, buffer);
      const { openPath } = await import('@tauri-apps/plugin-opener');
      await openPath(filePath);
    } else {
      const { getSavePath } = await import('src/utils/ui');
      const { canceled, filePath } = await getSavePath(name, 'pdf');
      if (canceled || !filePath) {
        return;
      }

      const pdfBuffer = await pdfMake.createPdf(docDefinition).getBuffer();
      const buffer = new Uint8Array(pdfBuffer);

      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(filePath, buffer);

      const { showExportInFolder } = await import('src/utils/ui');
      showExportInFolder(t`PDF Saved`, filePath);
    }

    fyo.telemetry.log(Verb.Printed, report.value!.reportName);
  } catch (err) {
    console.error(err);
    const { showToast } = await import('src/utils/interactive');
    showToast({ message: t`PDF generation failed`, type: 'error' });
  }
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
@reference "../../styles/index.css";
.outer-container {
  display: grid;
  grid-template-columns: auto var(--w-quick-edit);
  @apply h-full overflow-auto;
}
</style>

<style>
/* Force text and borders inside the white report print preview card to be dark/black in dark mode */
html.dark .print-preview-paper,
html.dark .print-preview-paper td,
html.dark .print-preview-paper p,
html.dark .print-preview-paper span,
html.dark .print-preview-paper div,
html.dark .print-preview-paper th,
html.dark .print-preview-paper table,
html.dark .print-preview-paper h1,
html.dark .print-preview-paper h2,
html.dark .print-preview-paper h3,
html.dark .print-preview-paper h4 {
  color: oklch(0.145 0 0) !important;
}

html.dark .print-preview-paper th,
html.dark .print-preview-paper td,
html.dark .print-preview-paper table,
html.dark .print-preview-paper div {
  border-color: oklch(0.922 0 0) !important;
}
</style>
