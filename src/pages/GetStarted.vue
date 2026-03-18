<template>
  <div class="flex flex-col overflow-y-hidden">
    <PageHeader :title="t`Set Up Your Workspace`" />
    <div
      class="flex-1 overflow-y-auto overflow-x-hidden custom-scroll custom-scroll-thumb1"
    >
      <div
        v-for="section in sections"
        :key="section.label"
        class="p-4 border-b dark:border-gray-800"
      >
        <h2 class="font-medium dark:text-gray-25">{{ section.label }}</h2>
        <div class="flex mt-4 gap-4">
          <div
            v-for="item in section.items"
            :key="item.label"
            class="w-full md:w-1/3 sm:w-1/2"
          >
            <div
              class="flex flex-col justify-between h-44 p-5 bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 rounded-lg dark:text-gray-100 text-gray-900"
              @mouseenter="() => (activeCard = item.key)"
              @mouseleave="() => (activeCard = null)"
            >
              <div>
                <component
                  :is="getIconComponent(item)"
                  v-show="activeCard !== item.key && !isCompleted(item)"
                  class="mb-4 w-6 h-6 text-foreground/80"
                />
                <LucideIcon
                  v-show="isCompleted(item)"
                  name="check"
                  :size="24"
                  class="w-6 h-6 mb-4 text-green-500"
                />
                <h3 class="font-bold text-base tracking-tight">
                  {{ item.label }}
                </h3>
                <p
                  class="mt-2 text-xs font-medium text-muted-foreground leading-relaxed"
                >
                  {{ item.description }}
                </p>
              </div>
              <div
                v-show="activeCard === item.key && !isCompleted(item)"
                class="flex mt-3 overflow-hidden gap-2"
              >
                <UIButton
                  v-if="item.action"
                  variant="default"
                  size="sm"
                  class="flex-1"
                  @click="handleAction(item)"
                >
                  {{ t`Set Up` }}
                </UIButton>
                <UIButton
                  v-if="item.documentation"
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  @click="handleDocumentation(item)"
                >
                  {{ t`Documentation` }}
                </UIButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { DocValue } from 'fyo/core/types';
import LucideIcon from 'src/components/LucideIcon.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { fyo } from 'src/initFyo';
import { getGetStartedConfig } from 'src/utils/getStartedConfig';
import { GetStartedConfigItem } from 'src/utils/types';
import { Component, defineComponent, h } from 'vue';

type ListItem = GetStartedConfigItem['items'][number];

export default defineComponent({
  name: 'GetStarted',
  components: {
    PageHeader,
    LucideIcon,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data() {
    return {
      activeCard: null as string | null,
      sections: getGetStartedConfig(),
    };
  },
  async activated() {
    await fyo.doc.getDoc('GetStarted');
    await this.checkForCompletedTasks();
  },
  methods: {
    async handleDocumentation({ key, documentation }: ListItem) {
      if (documentation) {
        window.ipc.openExternalUrl(documentation);
      }

      switch (key) {
        case 'Opening Balances':
          await this.updateChecks({ openingBalanceChecked: true });
          break;
      }
    },
    async handleAction({ key, action }: ListItem) {
      if (action) {
        action();
        this.activeCard = null;
      }

      switch (key) {
        case 'Print':
          await this.updateChecks({ printSetup: true });
          break;
        case 'General':
          await this.updateChecks({ companySetup: true });
          break;
        case 'System':
          await this.updateChecks({ systemSetup: true });
          break;
        case 'Review Accounts':
          await this.updateChecks({ chartOfAccountsReviewed: true });
          break;
        case 'Add Taxes':
          await this.updateChecks({ taxesAdded: true });
          break;
      }
    },
    async checkIsOnboardingComplete() {
      if (fyo.singles.GetStarted?.onboardingComplete) {
        return true;
      }

      const doc = await fyo.doc.getDoc('GetStarted');
      const onboardingComplete = fyo.schemaMap.GetStarted?.fields
        .filter(({ fieldname }) => fieldname !== 'onboardingComplete')
        .map(({ fieldname }) => doc.get(fieldname))
        .every(Boolean);

      if (onboardingComplete) {
        await this.updateChecks({ onboardingComplete });
        const systemSettings = await fyo.doc.getDoc('SystemSettings');
        await systemSettings.set('hideGetStarted', true);
        await systemSettings.sync();
      }

      return onboardingComplete;
    },
    async checkForCompletedTasks() {
      let toUpdate: Record<string, DocValue> = {};
      if (await this.checkIsOnboardingComplete()) {
        return;
      }

      if (!fyo.singles.GetStarted?.salesItemCreated) {
        const count = await fyo.db.count('Item', { filters: { for: 'Sales' } });
        toUpdate.salesItemCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.purchaseItemCreated) {
        const count = await fyo.db.count('Item', {
          filters: { for: 'Purchases' },
        });
        toUpdate.purchaseItemCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.invoiceCreated) {
        const count = await fyo.db.count('SalesInvoice');
        toUpdate.invoiceCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.customerCreated) {
        const count = await fyo.db.count('Party', {
          filters: { role: 'Customer' },
        });
        toUpdate.customerCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.billCreated) {
        const count = await fyo.db.count('SalesInvoice');
        toUpdate.billCreated = count > 0;
      }

      if (!fyo.singles.GetStarted?.supplierCreated) {
        const count = await fyo.db.count('Party', {
          filters: { role: 'Supplier' },
        });
        toUpdate.supplierCreated = count > 0;
      }
      await this.updateChecks(toUpdate);
    },
    async updateChecks(toUpdate: Record<string, DocValue>) {
      await fyo.singles.GetStarted?.setAndSync(toUpdate);
      await fyo.doc.getDoc('GetStarted');
    },
    isCompleted(item: ListItem) {
      return fyo.singles.GetStarted?.get(item.fieldname) || false;
    },
    getIconComponent(item: ListItem) {
      let completed = fyo.singles.GetStarted?.[item.fieldname] || false;
      let name = completed ? 'green-check' : item.icon;
      let size = completed ? '24' : '18';
      return {
        name,
        render() {
          return h(LucideIcon, {
            ...Object.assign(
              {
                name,
                size,
              },
              this.$attrs
            ),
          });
        },
      } as Component;
    },
  },
});
</script>
