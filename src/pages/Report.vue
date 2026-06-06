<template>
  <view class="flex flex-col w-full h-full">
    <PageHeader :title="title">
      <DropdownWithActions :actions="reportActions" />
    </PageHeader>

    <!-- Filters -->
    <view
      v-if="report && report.filters.length"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4 border-b border-border items-end"
    >
      <FormControl
        v-for="field in report.filters"
        :key="field.fieldname + '-filter'"
        :border="true"
        size="large"
        :class="[field.fieldtype === 'Check' ? 'h-10 flex items-center' : '']"
        :show-label="true"
        :df="field"
        :value="report.get(field.fieldname)"
        :read-only="loading"
        @change="async (value) => await report?.set(field.fieldname, value)"
      />
    </view>

    <!-- Report Body -->
    <ListReport v-if="report" :report="report" class="" />
  </view>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  inject,
  provide,
  onActivated,
  onDeactivated,
} from 'vue';
import { useRoute } from 'vue-router';
import { t } from 'fyo';
import { DocValue } from 'fyo/core/types';
import { reports } from 'reports';
import { Report } from 'reports/Report';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { docsPathMap, getReport } from 'src/utils/misc';
import { routeTo } from 'src/utils/ui';
import { useAppStore } from 'src/stores/app';
import PageHeader from 'src/components/PageHeader.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import ListReport from 'src/components/Report/ListReport.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';

// Define Props
const props = withDefaults(
  defineProps<{
    reportClassName: keyof typeof reports;
    defaultFilters?: string;
  }>(),
  {
    defaultFilters: '{}',
  }
);

// Inject dependencies
const shortcuts = inject(shortcutsKey);
const store = useAppStore();
const route = useRoute();

// State definition
const loading = ref(false);
const report = ref<Report | null>(null);

// Provide report down to child components
provide(
  'report',
  computed(() => report.value)
);

// Computed properties
const title = computed(() => {
  return reports[props.reportClassName]?.title ?? t`Report`;
});

const reportActions = computed(() => {
  const actions: any[] = [];

  const rawActions = report.value?.getActions() ?? [];
  actions.push(...rawActions);

  if (report.value) {
    actions.push({
      label: t`Print`,
      action: () => {
        routeTo(`/report-print/${props.reportClassName}`);
      },
    });
  }

  return actions;
});

// Methods
const setReportData = async () => {
  if (report.value === null) {
    report.value = await getReport(props.reportClassName);
  }

  if (!report.value.reportData.length) {
    await report.value.setReportData();
  } else if (report.value.shouldRefresh) {
    await report.value.setReportData(undefined, true);
  }
};

// Lifecycle Hooks (activated/deactivated)
onActivated(async () => {
  store.docsPath = docsPathMap[props.reportClassName] ?? docsPathMap.Reports!;
  await setReportData();

  const filters = route.query as Record<string, DocValue>;
  const validFilters: Record<string, DocValue> = {};

  if (filters.defaultFilters && typeof filters.defaultFilters === 'string') {
    const parsed = JSON.parse(filters.defaultFilters);
    Object.assign(validFilters, parsed);
  }

  for (const [key, value] of Object.entries(filters)) {
    if (key !== 'defaultFilters' && typeof value === 'string') {
      validFilters[key] = value;
    }
  }
  const filterKeys = Object.keys(validFilters);
  for (const key of filterKeys) {
    await report.value?.set(key, validFilters[key]);
  }

  if (filterKeys.length) {
    await report.value?.updateData();
  }

  if (store.isDevelopment && typeof window !== 'undefined') {
    // @ts-ignore
    window.rep = {
      loading,
      report,
      title,
      reportActions,
      setReportData,
    };
  }

  shortcuts?.pmod.set(props.reportClassName, ['KeyP'], async () => {
    await routeTo(`/report-print/${props.reportClassName}`);
  });
});

onDeactivated(() => {
  store.docsPath = '';
  shortcuts?.delete(props.reportClassName);
});
</script>
