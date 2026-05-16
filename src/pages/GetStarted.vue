<template>
  <div class="flex flex-col overflow-y-hidden">
    <PageHeader :title="t`Set Up Your Workspace`" />
    <div
      class="flex-1 overflow-y-auto overflow-x-hidden custom-scroll custom-scroll-thumb1"
    >
      <div
        v-for="section in sections"
        :key="section.label"
        class="p-4 border-b border-border"
      >
        <h2 class="font-medium text-main">{{ section.label }}</h2>
        <div class="flex mt-4 gap-4">
          <div
            v-for="item in section.items"
            :key="item.label"
            class="w-full md:w-1/3 sm:w-1/2"
          >
            <div
              class="flex flex-col justify-between min-h-40 p-4 border border-border text-main rounded-lg"
              @mouseenter="() => (activeCard = item.key)"
              @mouseleave="() => (activeCard = null)"
            >
              <div>
                <LucideIcon
                  v-if="!isCompleted(item)"
                  :name="item.icon"
                  :size="24"
                  class="mb-4 text-description"
                />
                <LucideIcon
                  v-else
                  name="check-circle-2"
                  :size="24"
                  class="mb-4 text-green-500"
                />
                <h3 class="font-medium">{{ item.label }}</h3>
                <p class="mt-2 text-sm text-description">
                  {{ item.description }}
                </p>
              </div>
              <div
                v-if="!isCompleted(item)"
                class="flex mt-4 overflow-hidden"
              >
                <Button
                  v-if="item.action"
                  class="leading-tight text-base"
                  type="primary"
                  @click="handleAction(item)"
                >
                  {{ t`Set Up` }}
                </Button>
                <Button
                  v-if="item.documentation"
                  class="leading-tight text-base"
                  :class="{ 'ms-4': item.action }"
                  @click="handleDocumentation(item)"
                >
                  {{ t`Documentation` }}
                </Button>
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
import Button from 'src/components/Button.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { fyo } from 'src/initFyo';
import { getGetStartedConfig } from 'src/utils/getStartedConfig';
import { GetStartedConfigItem } from 'src/utils/types';
import LucideIcon from 'src/components/LucideIcon.vue';
import { defineComponent } from 'vue';

type ListItem = GetStartedConfigItem['items'][number];

export default defineComponent({
  name: 'GetStarted',
  components: {
    PageHeader,
    Button,
    LucideIcon,
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
        if (documentation.startsWith('https://landigit.com/auditbooks/')) {
          const path = documentation.replace(
            'https://landigit.com/auditbooks/',
            ''
          );
          this.$router.push(`/help/${path}`);
        } else {
          ipc.openLink(documentation);
        }
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
  },
});
</script>
