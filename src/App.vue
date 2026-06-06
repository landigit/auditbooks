<template>
  <view
    v-if="!isLynx"
    id="app"
    class="bg-canvas h-screen flex flex-col font-sans overflow-hidden antialiased"
    :dir="languageDirection"
    :language="language"
  >
    <WindowsTitleBar
      v-if="appStore.platform !== 'Mac'"
      :db-path="appStore.dbPath"
      :company-name="appStore.companyName"
    />
    <!-- Main Contents -->
    <Desk
      v-if="activeScreen === 'Desk'"
      class="flex-1"
      :theme="theme"
      @change-db-file="showDbSelector"
      @toggle-darkmode="toggleDarkMode"
    />
    <DatabaseSelector
      v-if="activeScreen === 'DatabaseSelector'"
      ref="databaseSelector"
      @new-database="newDatabase"
      @file-selected="fileSelected"
    />
    <SetupWizard
      v-if="activeScreen === 'SetupWizard'"
      @setup-complete="setupComplete"
      @setup-canceled="showDbSelector"
    />

    <!-- Render target for toasts -->
    <view
      id="toast-container"
      class="absolute bottom-0 flex flex-col items-end mb-3 pe-6"
      style="width: 100%; pointer-events: none"
    ></view>
  </view>

  <view v-else class="MainView">
    <!-- Database Selector Page -->
    <DatabaseSelector
      v-if="activeScreen === 'DatabaseSelector'"
      @file-selected="fileSelected"
      @new-database="newDatabase"
    />

    <!-- Setup Wizard Page -->
    <view v-else-if="activeScreen === 'SetupWizard'" class="SetupContainer">
      <view class="SetupCard">
        <text class="SetupTitle">Set up your organization</text>
        <text class="SetupSubtitle"
          >Please enter your company details to initialize the database.</text
        >

        <view class="FormGroup">
          <text class="FormLabel">Company Name *</text>
          <input
            class="FormInput"
            v-model="setupForm.companyName"
            placeholder="e.g. Acme Corp"
          />
        </view>

        <view class="FormGroup">
          <text class="FormLabel">Full Name *</text>
          <input
            class="FormInput"
            v-model="setupForm.fullname"
            placeholder="e.g. John Doe"
          />
        </view>

        <view class="FormGroup">
          <text class="FormLabel">Email Address *</text>
          <input
            class="FormInput"
            v-model="setupForm.email"
            placeholder="e.g. john@acme.com"
          />
        </view>

        <view class="FormGroup">
          <text class="FormLabel">Bank Name *</text>
          <input
            class="FormInput"
            v-model="setupForm.bankName"
            placeholder="e.g. HDFC Bank"
          />
        </view>

        <view class="FormActions">
          <view class="Btn Btn--secondary" @tap="handleSetupCancel">
            <text class="BtnText">Cancel</text>
          </view>
          <view class="Btn Btn--secondary" @tap="fillDemoData">
            <text class="BtnText">Fill Demo</text>
          </view>
          <view
            class="Btn Btn--primary"
            :class="{ 'Btn--disabled': !isFormValid }"
            @tap="handleSetupSubmit"
          >
            <text class="BtnText BtnText--primary">Submit</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Desk / Dashboard Page -->
    <view v-else-if="activeScreen === 'Desk'" class="DeskContainer">
      <!-- Dynamic Route Switcher for Lynx -->
      <view v-if="activeComponent" class="flex-1 w-full h-full">
        <component :is="activeComponent" v-bind="activeRouteProps" />
      </view>

      <!-- Standard Tabbed Desk Dashboard -->
      <view v-else class="flex-1 flex flex-col h-full">
        <!-- Navbar / Header -->
        <view class="NavBar">
          <view class="NavBrand">
            <text class="BrandText">Auditbooks</text>
            <text class="BrandSubtitle">Native Edition</text>
          </view>
          <view class="DisconnectBtn" @tap="showDbSelector">
            <text class="DisconnectBtnText">Disconnect</text>
          </view>
        </view>

        <!-- Scrollable Main Content Area -->
        <scroll-view scroll-y="true" class="DeskContent">
          <!-- 🏠 HOME / DASHBOARD TAB -->
          <view v-if="currentTab === 'dashboard'" class="TabContent">
            <!-- Welcome banner -->
            <view class="WelcomeBanner">
              <text class="WelcomeTitle">Welcome, {{ stats.companyName }}</text>
              <text class="WelcomeSubtitle">{{ appStore.dbPath }}</text>
            </view>

            <!-- Metrics Grid -->
            <view class="MetricsGrid">
              <!-- Net Profit Card -->
              <view class="MetricCard MetricCard--profit">
                <text class="MetricLabel">Net Profit (YTD)</text>
                <text
                  class="MetricValue"
                  :class="{
                    'text-green': stats.netProfit >= 0,
                    'text-red': stats.netProfit < 0,
                  }"
                >
                  {{ formatCurrency(stats.netProfit) }}
                </text>
                <view
                  class="MetricBadge"
                  :class="
                    stats.netProfit >= 0
                      ? 'MetricBadge--profit'
                      : 'MetricBadge--loss'
                  "
                >
                  <text class="MetricBadgeText">{{
                    stats.netProfit >= 0 ? "Profit" : "Loss"
                  }}</text>
                </view>
              </view>

              <!-- Total Income Card -->
              <view class="MetricCard">
                <text class="MetricLabel">Total Income</text>
                <text class="MetricValue text-blue">
                  {{ formatCurrency(stats.totalIncome) }}
                </text>
              </view>

              <!-- Total Expenses Card -->
              <view class="MetricCard">
                <text class="MetricLabel">Total Expenses</text>
                <text class="MetricValue text-orange">
                  {{ formatCurrency(stats.totalExpenses) }}
                </text>
              </view>
            </view>

            <!-- Quick Actions -->
            <text class="SectionHeader">Quick Actions</text>
            <view class="QuickActionsGrid">
              <view
                class="QuickActionBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: {
                      schemaName: ModelNameEnum.SalesInvoice,
                      name: '',
                    },
                  })
                "
              >
                <text class="QuickActionIcon">➕📄</text>
                <text class="QuickActionLabel">Create Invoice</text>
              </view>
              <view
                class="QuickActionBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: { schemaName: ModelNameEnum.Party, name: '' },
                  })
                "
              >
                <text class="QuickActionIcon">➕👥</text>
                <text class="QuickActionLabel">Add Customer</text>
              </view>
              <view
                class="QuickActionBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: { schemaName: ModelNameEnum.Item, name: '' },
                  })
                "
              >
                <text class="QuickActionIcon">➕📦</text>
                <text class="QuickActionLabel">Add Item</text>
              </view>
            </view>
          </view>

          <!-- 📄 INVOICES TAB -->
          <view v-else-if="currentTab === 'invoices'" class="TabContent">
            <view class="TabHeader">
              <text class="TabTitle">Sales Invoices</text>
              <view
                class="AddIconBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: {
                      schemaName: ModelNameEnum.SalesInvoice,
                      name: '',
                    },
                  })
                "
              >
                <text class="AddIconText">+</text>
              </view>
            </view>

            <view class="DataList">
              <view v-if="!invoiceList.length" class="EmptyState">
                <text class="EmptyText"
                  >No invoices found. Tap + to create one.</text
                >
              </view>
              <view
                v-for="item in invoiceList"
                :key="item.name"
                class="DataRow"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: {
                      schemaName: ModelNameEnum.SalesInvoice,
                      name: item.name,
                    },
                  })
                "
              >
                <view class="DataRowMain">
                  <text class="DataRowTitle">{{ item.name }}</text>
                  <text class="DataRowSubtitle">{{ item.party }}</text>
                </view>
                <view class="DataRowSide">
                  <text class="DataRowValue">{{
                    formatCurrency(item.grandTotal)
                  }}</text>
                  <text class="DataRowMeta">{{ item.postingDate }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 👥 CUSTOMERS TAB -->
          <view v-else-if="currentTab === 'customers'" class="TabContent">
            <view class="TabHeader">
              <text class="TabTitle">Customers</text>
              <view
                class="AddIconBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: { schemaName: ModelNameEnum.Party, name: '' },
                  })
                "
              >
                <text class="AddIconText">+</text>
              </view>
            </view>

            <view class="DataList">
              <view v-if="!customerList.length" class="EmptyState">
                <text class="EmptyText"
                  >No customers found. Tap + to add one.</text
                >
              </view>
              <view
                v-for="item in customerList"
                :key="item.name"
                class="DataRow"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: {
                      schemaName: ModelNameEnum.Party,
                      name: item.name,
                    },
                  })
                "
              >
                <view class="DataRowMain">
                  <text class="DataRowTitle">{{ item.name }}</text>
                  <text class="DataRowSubtitle">{{
                    item.phone || item.email || "No contact details"
                  }}</text>
                </view>
                <view class="DataRowSide">
                  <text class="DataRowMeta">Balance</text>
                  <text
                    class="DataRowValue"
                    :class="{
                      'text-green': (item.outstandingAmount || 0) >= 0,
                    }"
                  >
                    {{ formatCurrency(item.outstandingAmount || 0) }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <!-- 📦 ITEMS TAB -->
          <view v-else-if="currentTab === 'items'" class="TabContent">
            <view class="TabHeader">
              <text class="TabTitle">Items & Products</text>
              <view
                class="AddIconBtn"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: { schemaName: ModelNameEnum.Item, name: '' },
                  })
                "
              >
                <text class="AddIconText">+</text>
              </view>
            </view>

            <view class="DataList">
              <view v-if="!itemList.length" class="EmptyState">
                <text class="EmptyText">No items found. Tap + to add one.</text>
              </view>
              <view
                v-for="item in itemList"
                :key="item.name"
                class="DataRow"
                @tap="
                  router.push({
                    name: 'CommonForm',
                    params: { schemaName: ModelNameEnum.Item, name: item.name },
                  })
                "
              >
                <view class="DataRowMain">
                  <text class="DataRowTitle">{{ item.itemName }}</text>
                  <text class="DataRowSubtitle">Code: {{ item.name }}</text>
                </view>
                <view class="DataRowSide">
                  <text class="DataRowMeta">Rate</text>
                  <text class="DataRowValue text-blue">{{
                    formatCurrency(item.rate)
                  }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Bottom Tab Bar -->
        <view class="TabBar">
          <view
            class="TabItem"
            :class="{ 'TabItem--active': currentTab === 'dashboard' }"
            @tap="switchTab('dashboard')"
          >
            <text class="TabIcon">🏠</text>
            <text class="TabLabel">Home</text>
          </view>
          <view
            class="TabItem"
            :class="{ 'TabItem--active': currentTab === 'invoices' }"
            @tap="switchTab('invoices')"
          >
            <text class="TabIcon">📄</text>
            <text class="TabLabel">Invoices</text>
          </view>
          <view
            class="TabItem"
            :class="{ 'TabItem--active': currentTab === 'customers' }"
            @tap="switchTab('customers')"
          >
            <text class="TabIcon">👥</text>
            <text class="TabLabel">Parties</text>
          </view>
          <view
            class="TabItem"
            :class="{ 'TabItem--active': currentTab === 'items' }"
            @tap="switchTab('items')"
          >
            <text class="TabIcon">📦</text>
            <text class="TabLabel">Items</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading Overlay -->
    <view v-if="showLoading" class="LoadingOverlay">
      <view class="Spinner" />
      <text class="LoadingText">{{ loadingMessage }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, shallowRef, computed, provide, onMounted } from "vue";
import dayjs from "dayjs";
import { ModelNameEnum } from "models/types";
import WindowsTitleBar from "./components/WindowsTitleBar.vue";
import { handleErrorWithDialog } from "./errorHandling";
import { fyo } from "./initFyo";
import { t } from "fyo";
import DatabaseSelector from "./pages/DatabaseSelector.vue";
import Desk from "./pages/Desk.vue";
import SetupWizard from "./pages/SetupWizard/SetupWizard.vue";
import setupInstance from "./setup/setupInstance";
import { SetupWizardOptions } from "./setup/types";
import "./styles/index.css";
import { connectToDatabase, dbErrorActionSymbols } from "./utils/db";
import { initializeInstance } from "./utils/initialization";
import * as injectionKeys from "./utils/injectionKeys";
import { showDialog, showToast, isLynx } from "./utils/interactive";
import { setLanguageMap } from "./utils/language";
import { updateConfigFiles } from "./utils/misc";
import { updatePrintTemplates } from "./utils/printTemplates";
import { Search } from "./utils/search";
import { Shortcuts } from "./utils/shortcuts";
import { routeTo } from "./utils/ui";
import { useKeys } from "./utils/vueUtils";
import { useAppStore } from "./stores/app";
import { setTheme, setFont } from "src/utils/theme";
import {
  registerInstanceToERPNext,
  updateERPNSyncSettings,
} from "./utils/erpnextSync";
import { ERPNextSyncSettings } from "models/baseModels/ERPNextSyncSettings/ERPNextSyncSettings";
import { ErrorLogEnum } from "fyo/telemetry/types";
import router from "src/router";
import CommonForm from "./pages/CommonForm/CommonForm.vue";
import ListView from "./pages/ListView/ListView.vue";
import POS from "./pages/POS/POS.vue";
import Settings from "./pages/Settings/Settings.vue";
import Report from "./pages/Report.vue";
import ChartOfAccounts from "./pages/ChartOfAccounts.vue";
import Calendar from "./pages/Calendar.vue";
import HelpView from "./pages/HelpView.vue";
import ImportWizard from "./pages/ImportWizard.vue";
import TemplateBuilder from "./pages/TemplateBuilder/TemplateBuilder.vue";
import CustomizeForm from "./pages/CustomizeForm/CustomizeForm.vue";
import PrintView from "./pages/PrintView/PrintView.vue";
import ReportPrintView from "./pages/PrintView/ReportPrintView.vue";
import GetStarted from "./pages/GetStarted.vue";

enum Screen {
  Desk = "Desk",
  DatabaseSelector = "DatabaseSelector",
  SetupWizard = "SetupWizard",
}

// Setup Form State for Lynx
const setupForm = ref({
  companyName: "",
  fullname: "",
  email: "",
  bankName: "",
  country: "India",
  currency: "INR",
  chartOfAccounts: "India - Chart of Accounts",
  logo: null as string | null,
  fiscalYearStart: "",
  fiscalYearEnd: "",
});

// Dashboard State for Lynx
const stats = ref({
  companyName: "",
  currency: "",
  netProfit: 0,
  totalIncome: 0,
  totalExpenses: 0,
});

const isFormValid = computed(() => {
  return (
    setupForm.value.companyName.trim() &&
    setupForm.value.fullname.trim() &&
    setupForm.value.email.trim() &&
    setupForm.value.bankName.trim()
  );
});

const showLoading = ref(false);
const loadingMessage = ref("");

const keys = useKeys();
const searcher = shallowRef<null | Search>(null);
const shortcuts = new Shortcuts(keys);
const appStore = useAppStore();

provide(injectionKeys.keysKey, keys);
provide(injectionKeys.searcherKey, searcher);
provide(injectionKeys.shortcutsKey, shortcuts);
provide(
  injectionKeys.languageDirectionKey,
  computed(() => appStore.languageDirection),
);

const databaseSelector = ref<InstanceType<typeof DatabaseSelector> | null>(
  null,
);
const activeScreen = ref<Screen | null>(null);

const language = computed(() => appStore.language);
const theme = computed(() => appStore.theme);
const languageDirection = computed(() => appStore.languageDirection);

onMounted(async () => {
  await setInitialScreen();
  if (!isLynx) {
    const themeSetting = (fyo.singles.SystemSettings?.theme as any) || "auto";
    const fontSetting = fyo.singles.SystemSettings?.font;
    setTheme(themeSetting);
    setFont(fontSetting as string);
    appStore.theme = themeSetting;
  }
});

async function setInitialScreen(): Promise<void> {
  const lastSelectedFilePath = fyo.config.get("lastSelectedFilePath", null);

  if (
    typeof lastSelectedFilePath !== "string" ||
    !lastSelectedFilePath.length
  ) {
    activeScreen.value = Screen.DatabaseSelector;
    return;
  }

  await fileSelected(lastSelectedFilePath);
}

async function setSearcher(): Promise<void> {
  searcher.value = new Search(fyo);
  await searcher.value.initializeKeywords();
}

async function setDesk(filePath: string): Promise<void> {
  await setLanguageMap();
  activeScreen.value = Screen.Desk;
  if (!isLynx) {
    await setDeskRoute();
    await fyo.telemetry.start(true);
    await ipc.checkForUpdates();
    appStore.dbPath = filePath;
    appStore.companyName = (await fyo.getValue(
      ModelNameEnum.AccountingSettings,
      "companyName",
    )) as string;
    await setSearcher();
    updateConfigFiles(fyo);
  } else {
    appStore.dbPath = filePath;
    appStore.companyName = (await fyo.getValue(
      ModelNameEnum.AccountingSettings,
      "companyName",
    )) as string;
  }
}

function newDatabase() {
  activeScreen.value = Screen.SetupWizard;
}

async function fileSelected(filePath: string): Promise<void> {
  fyo.config.set("lastSelectedFilePath", filePath);
  if (filePath !== ":memory:" && !(await ipc.checkDbAccess(filePath))) {
    await showDialog({
      title: t`Cannot open file`,
      type: "error",
      detail: t`Auditbooks does not have access to the selected file: ${filePath}`,
    });

    fyo.config.set("lastSelectedFilePath", null);
    return;
  }

  try {
    await showSetupWizardOrDesk(filePath);
  } catch (error) {
    await handleErrorWithDialog(error, undefined, true, true);
    await showDbSelector();
  }
}

async function setupComplete(
  setupWizardOptions: SetupWizardOptions,
): Promise<void> {
  const companyName = setupWizardOptions.companyName;
  const filePath = await ipc.getDbDefaultPath(companyName);
  await setupInstance(filePath, setupWizardOptions, fyo);
  fyo.config.set("lastSelectedFilePath", filePath);
  await setDesk(filePath);
}

async function showSetupWizardOrDesk(filePath: string): Promise<void> {
  const { countryCode, error, actionSymbol } = await connectToDatabase(
    fyo,
    filePath,
  );

  if (!countryCode && error && actionSymbol) {
    return await handleConnectionFailed(error, actionSymbol);
  }

  const setupCompleteVal = await fyo.getValue(
    ModelNameEnum.AccountingSettings,
    "setupComplete",
  );

  if (!setupCompleteVal) {
    activeScreen.value = Screen.SetupWizard;
    return;
  }

  await initializeInstance(filePath, false, countryCode, fyo);
  if (!isLynx) {
    await updatePrintTemplates(fyo);

    const syncSettingsDoc = (await fyo.doc.getDoc(
      ModelNameEnum.ERPNextSyncSettings,
    )) as ERPNextSyncSettings;

    const baseURL = syncSettingsDoc.baseURL;
    const token = syncSettingsDoc.authToken;
    const enableERPNextSync = fyo.singles.AccountingSettings?.enableERPNextSync;

    if (enableERPNextSync && baseURL && token) {
      try {
        await registerInstanceToERPNext(fyo);
        await updateERPNSyncSettings(fyo);
        await ipc.initScheduler(
          `${fyo.singles.ERPNextSyncSettings?.dataSyncInterval as string}m`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        try {
          const existing = await fyo.db.getAll(
            ErrorLogEnum.IntegrationErrorLog,
            {
              filters: {
                error: errorMessage,
              },
              limit: 1,
            },
          );

          if (!existing.length) {
            await fyo.doc
              .getNewDoc(ErrorLogEnum.IntegrationErrorLog, {
                error: errorMessage,
                data: JSON.stringify({
                  instance: fyo.singles.ERPNextSyncSettings?.deviceID,
                  operation: "register_instance",
                  trigger: "showSetupWizardOrDesk",
                  baseURL: baseURL,
                }),
              })
              .sync();
          }
        } catch (logError) {
          throw logError;
        }
        showToast({ message: "Connection Failed", type: "error" });
      }
    }
  } else {
    await loadDashboardStats();
  }

  await setDesk(filePath);
}

async function handleConnectionFailed(error: Error, actionSymbol: symbol) {
  await showDbSelector();

  if (actionSymbol === dbErrorActionSymbols.CancelSelection) {
    return;
  }

  if (actionSymbol === dbErrorActionSymbols.SelectFile) {
    await databaseSelector.value?.existingDatabase();
    return;
  }

  throw error;
}

async function setDeskRoute(): Promise<void> {
  const { onboardingComplete } = await fyo.doc.getDoc("GetStarted");
  const { hideGetStarted } = await fyo.doc.getDoc("SystemSettings");

  let route = "/get-started";
  if (hideGetStarted || onboardingComplete) {
    route = localStorage.getItem("lastRoute") || "/";
  }

  await routeTo(route);
}

async function showDbSelector(): Promise<void> {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  fyo.config.set("lastSelectedFilePath", null);
  fyo.telemetry.stop();
  await fyo.purgeCache();
  activeScreen.value = Screen.DatabaseSelector;
  appStore.dbPath = "";
  searcher.value = null;
  appStore.companyName = "";
}

async function toggleDarkMode() {
  const isCurrentlyDark = appStore.isDark;

  appStore.theme = isCurrentlyDark ? "light" : "dark";

  setTheme(appStore.theme);

  const doc = await fyo.doc.getDoc("SystemSettings");
  await doc.set("theme", appStore.theme);
  await doc.sync();
}

// Lynx specific logic
function handleSetupCancel() {
  activeScreen.value = Screen.DatabaseSelector;
}

function fillDemoData() {
  setupForm.value.companyName = "Lin's Things";
  setupForm.value.fullname = "Lin Slovenly";
  setupForm.value.email = "lin@lthings.com";
  setupForm.value.bankName = "Max Finance";
  setupForm.value.country = "India";
  setupForm.value.currency = "INR";
  setupForm.value.chartOfAccounts = "India - Chart of Accounts";
  setupForm.value.logo = null;
  setupForm.value.fiscalYearStart = "2026-04-01";
  setupForm.value.fiscalYearEnd = "2027-03-31";
}

async function handleSetupSubmit() {
  if (!isFormValid.value) return;
  showLoading.value = true;
  loadingMessage.value = "Setting up database, this may take a moment...";
  try {
    let filePath = (appStore.dbPath ||
      fyo.config.get("lastSelectedFilePath")) as string | undefined;
    if (!filePath) {
      filePath = (await (globalThis as any).ipc.getDbDefaultPath(
        setupForm.value.companyName,
      )) as string | undefined;
    }
    if (!filePath) {
      showLoading.value = false;
      return;
    }
    await setupInstance(filePath, setupForm.value, fyo);
    fyo.config.set("lastSelectedFilePath", filePath);
    appStore.dbPath = filePath;
    await loadDashboardStats();
    await setDesk(filePath);
  } catch (err) {
    console.error("Setup failed:", err);
  } finally {
    showLoading.value = false;
  }
}

async function loadDashboardStats() {
  stats.value.companyName =
    (fyo.singles.AccountingSettings?.companyName as string) || "My Company";
  stats.value.currency =
    (fyo.singles.SystemSettings?.currency as string) || "INR";

  try {
    const startOfYear = dayjs().startOf("year").format("YYYY-MM-DD");
    const endOfYear = dayjs().endOf("year").format("YYYY-MM-DD");
    const res = (await fyo.db.getIncomeAndExpenses(
      startOfYear,
      endOfYear,
    )) as any;

    let incTotal = 0;
    let expTotal = 0;
    if (res.income) {
      incTotal = res.income.reduce(
        (sum: number, row: any) => sum + Number(row.balance || 0),
        0,
      );
    }
    if (res.expense) {
      expTotal = res.expense.reduce(
        (sum: number, row: any) => sum + Number(row.balance || 0),
        0,
      );
    }

    stats.value.totalIncome = incTotal;
    stats.value.totalExpenses = expTotal;
    stats.value.netProfit = incTotal - expTotal;
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

function formatCurrency(val: number) {
  try {
    const currencySym =
      stats.value.currency === "INR" ? "₹" : stats.value.currency || "$";
    return (
      currencySym +
      " " +
      Number(val).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  } catch {
    return (stats.value.currency || "$") + " " + val.toFixed(2);
  }
}

const componentMap: Record<string, any> = {
  CommonForm,
  ListView,
  "Point of Sale": POS,
  Settings,
  Report,
  "Chart Of Accounts": ChartOfAccounts,
  Calendar,
  Help: HelpView,
  "Import Wizard": ImportWizard,
  "Template Builder": TemplateBuilder,
  "Customize Form": CustomizeForm,
  PrintView,
  ReportPrintView,
  GetStarted,
};

const activeComponent = computed(() => {
  const name = router.currentRoute.value.name;
  if (typeof name === "string") {
    return componentMap[name];
  }
  return null;
});

const activeRouteProps = computed(() => {
  return router.currentRoute.value.params || {};
});

// Lynx Native Multipage/Tab State
const currentTab = ref<"dashboard" | "invoices" | "customers" | "items">(
  "dashboard",
);
const invoiceList = ref<any[]>([]);
const customerList = ref<any[]>([]);
const itemList = ref<any[]>([]);

async function fetchInvoiceList() {
  try {
    const data = await fyo.db.getAll(ModelNameEnum.SalesInvoice, {
      fields: [
        "name",
        "party",
        "postingDate",
        "grandTotal",
        "outstandingAmount",
      ],
      orderBy: ["postingDate"],
      order: "desc",
    });
    invoiceList.value = data || [];
  } catch (err) {
    console.error("Failed to load invoices:", err);
  }
}

async function fetchCustomerList() {
  try {
    const data = await fyo.db.getAll(ModelNameEnum.Party, {
      fields: ["name", "email", "phone", "outstandingAmount"],
      filters: { role: "Customer" },
    });
    customerList.value = data || [];
  } catch (err) {
    console.error("Failed to load customers:", err);
  }
}

async function fetchItemList() {
  try {
    const data = await fyo.db.getAll(ModelNameEnum.Item, {
      fields: ["name", "itemName", "rate"],
    });
    itemList.value = data || [];
  } catch (err) {
    console.error("Failed to load items:", err);
  }
}

async function switchTab(
  tab: "dashboard" | "invoices" | "customers" | "items",
) {
  currentTab.value = tab;
  if (tab === "dashboard") {
    await loadDashboardStats();
  } else if (tab === "invoices") {
    await fetchInvoiceList();
  } else if (tab === "customers") {
    await fetchCustomerList();
  } else if (tab === "items") {
    await fetchItemList();
  }
}
</script>

<style scoped>
/* Lynx Scoped Styles */

/* Loading Overlay */
.LoadingOverlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(11, 15, 25, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.Spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(56, 189, 248, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  margin-bottom: 16px;
}

.LoadingText {
  color: #38bdf8;
  font-size: 16px;
  font-weight: 500;
}

/* Setup Wizard Styles */
.SetupContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background-color: #0b0f19;
  padding: 16px;
}

.SetupCard {
  width: 100%;
  max-width: 440px;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}

.SetupTitle {
  color: #f8fafc;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}

.SetupSubtitle {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 20px;
}

.FormGroup {
  margin-bottom: 16px;
}

.FormLabel {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.FormInput {
  width: 100%;
  height: 40px;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 0 12px;
  color: #f8fafc;
  font-size: 14px;
}

.FormActions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 24px;
}

/* Button Styles */
.Btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 6px;
  padding: 0 16px;
}

.Btn--primary {
  background-color: #38bdf8;
}

.Btn--primary:active {
  background-color: #0ea5e9;
}

.Btn--secondary {
  background-color: #334155;
  border: 1px solid #475569;
}

.Btn--secondary:active {
  background-color: #475569;
}

.Btn--disabled {
  opacity: 0.5;
}

.BtnText {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
}

.BtnText--primary {
  color: #0f172a;
  font-weight: 600;
}

/* Desk / Dashboard Styles */
.DeskContainer {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #0b0f19;
}

.NavBar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 0 16px;
}

.NavBrand {
  display: flex;
  flex-direction: column;
}

.BrandText {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 700;
}

.BrandSubtitle {
  color: #38bdf8;
  font-size: 10px;
  font-weight: 500;
}

.DisconnectBtn {
  background-color: #ef4444;
  border-radius: 4px;
  padding: 6px 12px;
}

.DisconnectBtn:active {
  background-color: #dc2626;
}

.DisconnectBtnText {
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.DeskBody {
  flex: 1;
  padding: 16px;
}

.WelcomeBanner {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.WelcomeTitle {
  color: #f8fafc;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.WelcomeSubtitle {
  color: #64748b;
  font-size: 11px;
}

.MetricsGrid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.MetricCard {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 16px;
  position: relative;
}

.MetricCard--profit {
  border-left: 4px solid #34d399;
}

.MetricLabel {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.MetricValue {
  font-size: 20px;
  font-weight: 700;
}

.text-green {
  color: #34d399;
}

.text-red {
  color: #f87171;
}

.text-blue {
  color: #38bdf8;
}

.text-orange {
  color: #fb923c;
}

.MetricBadge {
  position: absolute;
  right: 16px;
  top: 16px;
  border-radius: 12px;
  padding: 2px 8px;
}

.MetricBadge--profit {
  background-color: rgba(52, 211, 153, 0.15);
}

.MetricBadge--loss {
  background-color: rgba(248, 113, 113, 0.15);
}

.MetricBadgeText {
  font-size: 10px;
  font-weight: 600;
}

.MetricBadge--profit .MetricBadgeText {
  color: #34d399;
}

.MetricBadge--loss .MetricBadgeText {
  color: #f87171;
}

/* Tabbed Desk Layout */

.TabBar {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background-color: #1e293b;
  border-top: 1px solid #334155;
  height: 64px;
  padding-bottom: 4px;
}

.TabItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
}

.TabIcon {
  font-size: 20px;
  margin-bottom: 2px;
}

.TabLabel {
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
}

.TabItem--active .TabLabel {
  color: #38bdf8;
  font-weight: 700;
}

.TabContent {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.SectionHeader {
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
  margin-top: 24px;
  margin-bottom: 12px;
}

.QuickActionsGrid {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.QuickActionBtn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 8px;
}

.QuickActionIcon {
  font-size: 22px;
  margin-bottom: 6px;
}

.QuickActionLabel {
  font-size: 11px;
  color: #f8fafc;
  font-weight: 500;
  text-align: center;
}

.TabHeader {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.TabTitle {
  font-size: 20px;
  font-weight: 700;
  color: #f8fafc;
}

.AddIconBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #38bdf8;
  border-radius: 50%;
}

.AddIconText {
  color: #0f172a;
  font-size: 22px;
  font-weight: bold;
}

.DataList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 40px;
}

.EmptyState {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.EmptyText {
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.DataRow {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
}

.DataRowMain {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.DataRowTitle {
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
}

.DataRowSubtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}

.DataRowSide {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.DataRowValue {
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.DataRowMeta {
  font-size: 10px;
  color: #64748b;
  margin-bottom: 2px;
}

.FormModalOverlay {
  position: absolute;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(11, 15, 25, 0.75);
  display: flex;
  justify-content: flex-end;
  flex-direction: column;
  z-index: 900;
}

.FormModalCard {
  background-color: #1e293b;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  border-top: 1px solid #334155;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.FormModalHeader {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #334155;
}

.FormModalTitle {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.CloseBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #334155;
}

.CloseBtnText {
  color: #cbd5e1;
  font-size: 12px;
}

.FormModalBody {
  flex: 1;
  padding: 16px;
}

.SelectorTrigger {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 10px 12px;
  height: 40px;
}

.SelectorTriggerText {
  color: #94a3b8;
  font-size: 13px;
}

.InlineSelectorList {
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  margin-top: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.InlineSelectorItem {
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
}

.InlineSelectorText {
  color: #cbd5e1;
  font-size: 13px;
}

.SelectorEmptyText {
  color: #64748b;
  font-size: 12px;
  padding: 12px;
  text-align: center;
}

.FormModalActions {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid #334155;
  background-color: #1e293b;
}
</style>
