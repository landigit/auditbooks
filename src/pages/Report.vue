<template>
  <div class="flex flex-col w-full h-full">
    <PageHeader :title="title">
      <DropdownWithActions
        v-for="group of groupedActions"
        :key="group.label"
        :icon="false"
        :type="group.type"
        :actions="group.actions"
        class="text-xs"
      >
        {{ group.group }}
      </DropdownWithActions>
      <Button
        ref="printButton"
        :icon="true"
        :title="t`Open Report Print View`"
        @click="routeTo(`/report-print/${reportClassName}`)"
      >
        <feather-icon name="printer" class="w-4 h-4"></feather-icon>
      </Button>
    </PageHeader>

    <!-- Filters -->
    <div
      v-if="report && report.filters.length"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 p-3 border-b dark:border-gray-800"
    >
      <FormControl
        v-for="field in report.filters"
        :key="field.fieldname + '-filter'"
        :border="true"
        size="small"
        :show-label="true"
        :df="field"
        :value="report.get(field.fieldname)"
        :read-only="loading"
        :align-with-inputs="field.fieldtype !== 'Check' && hasMixedFilters"
        :class="{ 'self-end pb-0.5': field.fieldtype === 'Check' && hasMixedFilters }"
        @change="async (value) => await report?.set(field.fieldname, value)"
      />
    </div>

    <!-- Report Body -->
    <ListReport v-if="report" :report="report" class="" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated, provide } from 'vue';
import { useRoute } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { reports } from 'reports';
import { Report } from 'reports/Report';
import Button from 'src/components/Button.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ListReport from 'src/components/Report/ListReport.vue';
import { fyo } from 'src/initFyo';
import { docsPathMap, getReport } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { ActionGroup } from 'src/utils/types';
import { routeTo } from 'src/utils/ui';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useApp } from 'src/composables/useApp';

const props = withDefaults(
  defineProps<{
    reportClassName: keyof typeof reports;
    defaultFilters?: string;
  }>(),
  {
    defaultFilters: '{}',
  }
);

const { t } = useApp();
const shortcuts = useShortcuts();
const route = useRoute();

const loading = ref(false);
const report = ref<Report | null>(null);

provide('report', computed(() => report.value));

const title = computed(() => {
  return reports[props.reportClassName]?.title ?? t`Report`;
});

const hasMixedFilters = computed(() => {
  return (report.value?.filters ?? []).some(
    (f) => f.fieldtype !== 'Check' && !f.hidden
  );
});

const groupedActions = computed(() => {
  const actions = report.value?.getActions() ?? [];
  const actionsMap = actions.reduce((acc, ac) => {
    if (!ac.group) {
      ac.group = 'none';
    }

    acc[ac.group] ??= {
      group: ac.group,
      label: ac.label ?? '',
      type: ac.type ?? 'secondary',
      actions: [],
    };

    acc[ac.group].actions.push(ac);
    return acc;
  }, {} as Record<string, ActionGroup>);

  return Object.values(actionsMap);
});

async function setReportData() {
  if (report.value === null) {
    report.value = await getReport(props.reportClassName);
  }

  if (!report.value.reportData.length) {
    await report.value.setReportData();
  } else if (report.value.shouldRefresh) {
    await report.value.setReportData(undefined, true);
  }
}

onActivated(async () => {
  docsPathRef.value =
    docsPathMap[props.reportClassName] ?? docsPathMap.Reports!;
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

  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.rep = {
      loading: loading.value,
      report: report.value,
    };
  }

  shortcuts?.pmod.set(props.reportClassName, ['KeyP'], async () => {
    await routeTo(`/report-print/${props.reportClassName}`);
  });
});

onDeactivated(() => {
  docsPathRef.value = '';
  shortcuts?.delete(props.reportClassName);
});
</script>

