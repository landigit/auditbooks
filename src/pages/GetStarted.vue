<template>
  <view v-if="!isLynx">
    <view class="flex flex-col overflow-y-hidden">
      <PageHeader :title="t`Set Up Your Workspace`" />
      <view class="flex-1 overflow-y-auto overflow-x-hidden custom-scroll custom-scroll-thumb1">
        <view v-for="section in sections" :key="section.label" class="p-4 border-b border-border">
          <text class="font-medium text-main">{{ section.label }}</text>
          <view class="flex mt-4 gap-4">
            <view v-for="item in section.items" :key="item.label" class="w-full md:w-1/3 sm:w-1/2">
              <view
                class="flex flex-col justify-between min-h-40 p-4 border border-border text-main rounded-lg"
                @mouseenter="() => (activeCard = item.key)"
                @mouseleave="() => (activeCard = null)"
              >
                <view>
                  <LucideIcon
                    v-if="!isCompleted(item)"
                    :name="item.icon"
                    :size="24"
                    class="mb-4 text-description"
                  />
                  <LucideIcon v-else name="check-circle-2" :size="24" class="mb-4 text-green-500" />
                  <text class="font-medium">{{ item.label }}</text>
                  <text class="mt-2 text-sm text-description">
                    {{ item.description }}
                  </text>
                </view>
                <view v-if="!isCompleted(item)" class="flex mt-4 overflow-hidden">
                  <Button
                    v-if="item.action"
                    class="leading-tight text-base"
                    type="primary"
                    @tap="handleAction(item)"
                  >
                    {{ t`Set Up` }}
                  </Button>
                  <Button
                    v-if="item.documentation"
                    class="leading-tight text-base"
                    :class="{ 'ms-4': item.action }"
                    @tap="handleDocumentation(item)"
                  >
                    {{ t`Documentation` }}
                  </Button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="MainView">
    <view class="NavBar">
      <view class="NavBrand">
        <text class="BrandText">Set Up Workspace</text>
      </view>
    </view>
    <scroll-view scroll-y="true" class="DeskContent px-4 py-2">
      <view v-for="section in sections" :key="section.label" class="mb-6">
        <text class="text-base font-semibold text-main mb-3">{{ section.label }}</text>
        <view class="space-y-4">
          <view
            v-for="item in section.items"
            :key="item.label"
            class="p-4 bg-surface border border-border rounded-xl flex flex-col justify-between"
          >
            <view class="flex flex-row items-center mb-3">
              <text v-if="isCompleted(item)" class="text-xl mr-3">✅</text>
              <text v-else class="text-xl mr-3">🔘</text>
              <view class="flex-1">
                <text class="font-medium text-main text-sm">{{ item.label }}</text>
                <text class="text-xs text-description mt-1">{{ item.description }}</text>
              </view>
            </view>
            <view v-if="!isCompleted(item)" class="flex flex-row gap-3 mt-2">
              <view
                v-if="item.action"
                class="Btn Btn--primary py-1.5 px-4 rounded-lg"
                @tap="handleAction(item)"
              >
                <text class="BtnText BtnText--primary text-xs">Set Up</text>
              </view>
              <view
                v-if="item.documentation"
                class="Btn Btn--secondary py-1.5 px-4 rounded-lg"
                @tap="handleDocumentation(item)"
              >
                <text class="BtnText text-xs">Docs</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onActivated } from "vue";
import router from "src/router";
import { DocValue } from "fyo/core/types";
import Button from "src/components/Button.vue";
import PageHeader from "src/components/PageHeader.vue";
import { fyo } from "src/initFyo";
import { getGetStartedConfig } from "src/utils/getStartedConfig";
import { GetStartedConfigItem } from "src/utils/types";
import LucideIcon from "src/components/LucideIcon.vue";
import { t } from "fyo";

type ListItem = GetStartedConfigItem["items"][number];

// State definition
const activeCard = ref<string | null>(null);
const sections = ref(getGetStartedConfig());

// Methods
const isCompleted = (item: ListItem) => {
  return fyo.singles.GetStarted?.get(item.fieldname) || false;
};

const updateChecks = async (toUpdate: Record<string, DocValue>) => {
  await fyo.singles.GetStarted?.setAndSync(toUpdate);
  await fyo.doc.getDoc("GetStarted");
};

const checkIsOnboardingComplete = async () => {
  if (fyo.singles.GetStarted?.onboardingComplete) {
    return true;
  }

  const doc = await fyo.doc.getDoc("GetStarted");
  const onboardingComplete = fyo.schemaMap.GetStarted?.fields
    .filter(({ fieldname }) => fieldname !== "onboardingComplete")
    .map(({ fieldname }) => doc.get(fieldname))
    .every(Boolean);

  if (onboardingComplete) {
    await updateChecks({ onboardingComplete });
    const systemSettings = await fyo.doc.getDoc("SystemSettings");
    await systemSettings.set("hideGetStarted", true);
    await systemSettings.sync();
  }

  return onboardingComplete;
};

const checkForCompletedTasks = async () => {
  let toUpdate: Record<string, DocValue> = {};
  if (await checkIsOnboardingComplete()) {
    return;
  }

  if (!fyo.singles.GetStarted?.salesItemCreated) {
    const count = await fyo.db.count("Item", { filters: { for: "Sales" } });
    toUpdate.salesItemCreated = count > 0;
  }

  if (!fyo.singles.GetStarted?.purchaseItemCreated) {
    const count = await fyo.db.count("Item", {
      filters: { for: "Purchases" },
    });
    toUpdate.purchaseItemCreated = count > 0;
  }

  if (!fyo.singles.GetStarted?.invoiceCreated) {
    const count = await fyo.db.count("SalesInvoice");
    toUpdate.invoiceCreated = count > 0;
  }

  if (!fyo.singles.GetStarted?.customerCreated) {
    const count = await fyo.db.count("Party", {
      filters: { role: "Customer" },
    });
    toUpdate.customerCreated = count > 0;
  }

  if (!fyo.singles.GetStarted?.billCreated) {
    const count = await fyo.db.count("SalesInvoice");
    toUpdate.billCreated = count > 0;
  }

  if (!fyo.singles.GetStarted?.supplierCreated) {
    const count = await fyo.db.count("Party", {
      filters: { role: "Supplier" },
    });
    toUpdate.supplierCreated = count > 0;
  }
  await updateChecks(toUpdate);
};

const handleDocumentation = async ({ key, documentation }: ListItem) => {
  if (documentation) {
    if (documentation.startsWith("https://landigit.com/auditbooks/")) {
      const path = documentation.replace("https://landigit.com/auditbooks/", "");
      router.push(`/help/${path}`);
    } else {
      ipc.openLink(documentation);
    }
  }

  switch (key) {
    case "Opening Balances":
      await updateChecks({ openingBalanceChecked: true });
      break;
  }
};

const handleAction = async ({ key, action }: ListItem) => {
  if (action) {
    action();
    activeCard.value = null;
  }

  switch (key) {
    case "Print":
      await updateChecks({ printSetup: true });
      break;
    case "General":
      await updateChecks({ companySetup: true });
      break;
    case "System":
      await updateChecks({ systemSetup: true });
      break;
    case "Review Accounts":
      await updateChecks({ chartOfAccountsReviewed: true });
      break;
    case "Add Taxes":
      await updateChecks({ taxesAdded: true });
      break;
  }
};

// Keep Alive route activation hooks
onActivated(async () => {
  await fyo.doc.getDoc("GetStarted");
  await checkForCompletedTasks();
});
</script>
