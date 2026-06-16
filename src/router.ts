const ChartOfAccounts = () => import('src/pages/ChartOfAccounts.vue');
const CommonForm = () => import('src/pages/CommonForm/CommonForm.vue');
const Dashboard = () => import('src/pages/Dashboard/Dashboard.vue');
const GetStarted = () => import('src/pages/GetStarted.vue');
const ImportWizard = () => import('src/pages/ImportWizard.vue');
const ListView = () => import('src/composables/ListView/ListView.vue');
const InvoiceDesigner = () =>
  import('src/pages/InvoiceDesigner/InvoiceDesigner.vue');
const ReportPrintView = () => import('src/pages/PrintView/ReportPrintView.vue');
const QuickEditForm = () => import('src/pages/QuickEditForm.vue');
const Report = () => import('src/pages/Report.vue');
const Settings = () => import('src/pages/Settings/Settings.vue');
const CustomizeForm = () => import('src/pages/CustomizeForm/CustomizeForm.vue');
const POS = () => import('src/pages/POS/POS.vue');
import type { HistoryState } from 'vue-router';
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { historyState } from './utils/refs';

const routes: RouteRecordRaw[] = [
  {
    path: '/index.html',
    redirect: '/',
  },
  {
    path: '/',
    component: Dashboard,
  },
  {
    path: '/get-started',
    component: GetStarted,
  },
  {
    path: `/edit/:schemaName/:name`,
    name: `CommonForm`,
    components: {
      default: CommonForm,
      edit: QuickEditForm,
    },
    props: {
      default: (route) => ({
        schemaName: route.params.schemaName,
        name: route.params.name,
      }),
      edit: (route) => route.query,
    },
  },
  {
    path: '/list/:schemaName/:pageTitle?',
    name: 'ListView',
    components: {
      default: ListView,
      edit: QuickEditForm,
    },
    props: {
      default: (route) => {
        const { schemaName } = route.params;
        const pageTitle = route.params.pageTitle ?? '';

        const filters = {};
        const filterString = route.query.filters;
        if (typeof filterString === 'string') {
          Object.assign(filters, JSON.parse(filterString));
        }

        return {
          schemaName,
          filters,
          pageTitle,
        };
      },
      edit: (route) => route.query,
    },
  },
  {
    path: '/print/:schemaName/:name',
    name: 'PrintView',
    component: InvoiceDesigner,
    props: true,
  },
  {
    path: '/invoice-designer/:schemaName/:name',
    name: 'InvoiceDesigner',
    component: InvoiceDesigner,
    props: true,
  },
  {
    path: '/report-print/:reportName',
    name: 'ReportPrintView',
    component: ReportPrintView,
    props: true,
  },
  {
    path: '/report/:reportClassName',
    name: 'Report',
    component: Report,
    props: true,
  },
  {
    path: '/chart-of-accounts',
    name: 'Chart Of Accounts',
    components: {
      default: ChartOfAccounts,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/import-wizard',
    name: 'Import Wizard',
    component: ImportWizard,
  },
  {
    path: '/customize-form',
    name: 'Customize Form',
    component: CustomizeForm,
  },
  {
    path: '/settings',
    name: 'Settings',
    components: {
      default: Settings,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/pos',
    name: 'Point of Sale',
    components: {
      default: POS,
      edit: QuickEditForm,
    },
    props: {
      default: true,
      edit: (route) => route.query,
    },
  },
  {
    path: '/template-builder/:name',
    name: 'TemplateBuilderResolver',
    component: () =>
      import('src/pages/InvoiceDesigner/TemplateBuilderResolver.vue'),
    props: true,
  },
];

const router = createRouter({ routes, history: createWebHistory() });

router.afterEach(({ fullPath }) => {
  const state = history.state as HistoryState;
  historyState.forward = !!state.forward;
  historyState.back = !!state.back;

  if (fullPath.includes('index.html')) {
    return;
  }

  localStorage.setItem('lastRoute', fullPath);
});

export default router;
