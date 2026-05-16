<template>
  <div class="flex flex-col h-full">
    <PageHeader :title="t`Chart of Accounts`">
      <Button v-if="!isAllExpanded" @click="expand">{{ t`Expand` }}</Button>
      <Button v-if="!isAllCollapsed" @click="collapse">{{
        t`Collapse`
      }}</Button>
    </PageHeader>

    <!-- Chart of Accounts -->
    <div
      v-if="root"
      class="flex-1 flex flex-col overflow-y-auto mb-4 custom-scroll custom-scroll-thumb1"
    >
      <!-- Chart of Accounts Indented List -->
      <template v-for="account in allAccounts" :key="account.name">
        <!-- Account List Item -->
        <div
          class="py-2 cursor-pointer hover:bg-surface-hover text-main group flex items-center border-b border-border flex-shrink-0 pe-4"
          :class="[
            account.level !== 0 ? 'text-base' : 'text-lg',
            isQuickEditOpen(account) ? 'bg-canvas-muted' : '',
          ]"
          :style="getItemStyle(account.level)"
          @click="onClick(account)"
        >
          <LucideIcon
            :name="getIconName(!!account.isGroup, account.name)"
            :size="account.isGroup ? 20 : 16"
            class="text-description group-hover:text-main transition-colors"
          />
          <div class="flex items-baseline">
            <div
              class="ms-4"
              :class="[!account.parentAccount && 'font-semibold']"
            >
              {{ account.name }}
            </div>

            <!-- Add Account Buttons on Group Hover -->
            <div class="ms-6 hidden group-hover:block">
              <button
                v-if="account.isGroup"
                class="text-xs text-description hover:text-main focus:outline-none"
                @click.stop="addAccount(account, 'addingAccount')"
              >
                {{ t`Add Account` }}
              </button>
              <button
                v-if="account.isGroup"
                class="ms-3 text-xs text-description hover:text-main focus:outline-none"
                @click.stop="addAccount(account, 'addingGroupAccount')"
              >
                {{ t`Add Group` }}
              </button>
              <button
                class="ms-3 text-xs text-description hover:text-main focus:outline-none"
                @click.stop="deleteAccount(account)"
              >
                {{ account.isGroup ? t`Delete Group` : t`Delete Account` }}
              </button>
            </div>
          </div>

          <!-- Account Balance String -->
          <p v-if="!account.isGroup" class="ms-auto text-base text-description">
            {{ getBalanceString(account) }}
          </p>
        </div>

        <!-- Add Account/Group -->
        <div
          v-if="account.addingAccount || account.addingGroupAccount"
          :key="account.name + '-adding-account'"
          class="px-4 border-b border-border cursor-pointer hover:bg-surface-hover group flex items-center text-base"
          :style="getGroupStyle(account.level + 1)"
        >
          <LucideIcon
            :name="getIconName(!!account.addingGroupAccount)"
            :size="account.addingGroupAccount ? 20 : 16"
            class="text-description"
          />
          <div class="flex ms-4 h-row-mid items-center">
            <input
              :ref="account.name"
              v-model="newAccountName"
              class="focus:outline-none bg-transparent placeholder-description text-main"
              :class="{ 'text-description': insertingAccount }"
              :placeholder="t`New Account`"
              type="text"
              :disabled="insertingAccount"
              @keydown.esc="cancelAddingAccount(account)"
              @keydown.enter="
                createNewAccount(account, account.addingGroupAccount)
              "
            />
            <button
              v-if="!insertingAccount"
              class="ms-4 text-xs text-description hover:text-main focus:outline-none"
              @click="createNewAccount(account, account.addingGroupAccount)"
            >
              {{ t`Save` }}
            </button>
            <button
              v-if="!insertingAccount"
              class="ms-4 text-xs text-description hover:text-main focus:outline-none"
              @click="cancelAddingAccount(account)"
            >
              {{ t`Cancel` }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script lang="ts">
import { t } from 'fyo';
import { isCredit } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import PageHeader from 'src/components/PageHeader.vue';
import { fyo } from 'src/initFyo';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { docsPathMap } from 'src/utils/misc';
import { openQuickEdit, commongDocDelete } from 'src/utils/ui';
import { getMapFromList, removeAtIndex } from 'utils/index';
import { useAppStore } from 'src/stores/app';
import { defineComponent, nextTick, inject } from 'vue';
import Button from '../components/Button.vue';
import { handleErrorWithDialog } from '../errorHandling';
import LucideIcon from 'src/components/LucideIcon.vue';
import { AccountRootType, AccountType } from 'models/baseModels/Account/types';
import { TreeViewSettings } from 'fyo/model/types';
import { Doc } from 'fyo/model/doc';
import { showDialog } from 'src/utils/interactive';

type AccountItem = {
  name: string;
  parentAccount: string;
  rootType: AccountRootType;
  accountType: AccountType;
  level: number;
  location: number[];
  isGroup?: boolean;
  children: AccountItem[];
  expanded: boolean;
  addingAccount: boolean;
  addingGroupAccount: boolean;
};

type AccKey = 'addingAccount' | 'addingGroupAccount';

export default defineComponent({
  components: {
    Button,
    PageHeader,
    LucideIcon,
  },
  setup() {
    return {
      languageDirection: inject(languageDirectionKey),
      store: useAppStore(),
    };
  },
  data() {
    return {
      isAllCollapsed: true,
      isAllExpanded: false,
      root: null as null | { label: string; balance: number; currency: string },
      accounts: [] as AccountItem[],
      schemaName: 'Account',
      newAccountName: '',
      insertingAccount: false,
      totals: {} as Record<
        string,
        { totalCredit: number; totalDebit: number } | undefined
      >,
      refetchTotals: false,
      settings: null as null | TreeViewSettings,
    };
  },
  computed: {
    allAccounts() {
      const allAccounts: AccountItem[] = [];

      (function getAccounts(
        accounts: AccountItem[],
        level: number,
        location: number[]
      ) {
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];

          account.level = level;
          account.location = [...location, i];
          allAccounts.push(account);

          if (account.children != null && account.expanded) {
            getAccounts(account.children, level + 1, account.location);
          }
        }
      })(this.accounts, 0, []);

      return allAccounts;
    },
  },
  async mounted() {
    await this.setTotalDebitAndCredit();
    fyo.doc.observer.on('sync:AccountingLedgerEntry', () => {
      this.refetchTotals = true;
    });
  },
  async activated() {
    await this.fetchAccounts();
    if (this.store.isDevelopment) {
      // @ts-ignore
      window.coa = this;
    }

    this.store.docsPath = docsPathMap.ChartOfAccounts!;

    if (this.refetchTotals) {
      await this.setTotalDebitAndCredit();
      this.refetchTotals = false;
    }
  },
  deactivated() {
    this.store.docsPath = '';
  },
  methods: {
    async expand() {
      await this.toggleAll(this.accounts, true);
      this.isAllCollapsed = false;
      this.isAllExpanded = true;
    },
    async collapse() {
      await this.toggleAll(this.accounts, false);
      this.isAllExpanded = false;
      this.isAllCollapsed = true;
    },
    async toggleAll(accounts: AccountItem | AccountItem[], expand: boolean) {
      if (!Array.isArray(accounts)) {
        await this.toggle(accounts, expand);
        accounts = accounts.children ?? [];
      }

      for (const account of accounts) {
        await this.toggleAll(account, expand);
      }
    },
    async toggle(account: AccountItem, expand: boolean) {
      if (account.expanded === expand || !account.isGroup) {
        return;
      }

      await this.toggleChildren(account);
    },
    getBalance(account: AccountItem) {
      const total = this.totals[account.name];
      if (!total) {
        return 0;
      }

      const { totalCredit, totalDebit } = total;

      if (isCredit(account.rootType)) {
        return totalCredit - totalDebit;
      }

      return totalDebit - totalCredit;
    },
    getBalanceString(account: AccountItem) {
      const suffix = isCredit(account.rootType) ? t`Cr.` : t`Dr.`;
      const balance = this.getBalance(account);
      return `${fyo.format(balance, 'Currency')} ${suffix}`;
    },
    async setTotalDebitAndCredit() {
      const totals = await this.fyo.db.getTotalCreditAndDebit();
      this.totals = getMapFromList(totals, 'account');
    },
    async fetchAccounts() {
      this.settings =
        fyo.models[ModelNameEnum.Account]?.getTreeSettings(fyo) ?? null;
      const currency = this.fyo.singles.SystemSettings?.currency ?? '';
      const label = (await this.settings?.getRootLabel()) ?? '';

      this.root = {
        label,
        balance: 0,
        currency,
      };
      this.accounts = await this.getChildren();
    },
    async onClick(account: AccountItem) {
      let shouldOpen = !account.isGroup;
      if (account.isGroup) {
        shouldOpen = !(await this.toggleChildren(account));
      }

      if (account.isGroup && account.expanded) {
        this.isAllCollapsed = false;
      }

      if (account.isGroup && !account.expanded) {
        this.isAllExpanded = false;
      }

      if (!shouldOpen) {
        return;
      }

      const doc = await fyo.doc.getDoc(ModelNameEnum.Account, account.name);
      this.setOpenAccountDocListener(doc, account);
      await openQuickEdit({ doc });
    },
    setOpenAccountDocListener(
      doc: Doc,
      account?: AccountItem,
      parentAccount?: AccountItem
    ) {
      if (doc.hasListener('afterDelete')) {
        return;
      }

      doc.once('afterDelete', () => {
        this.removeAccount(doc.name!, account, parentAccount);
      });
    },
    async deleteAccount(account: AccountItem) {
      const canDelete = await this.canDeleteAccount(account);
      if (!canDelete) {
        return;
      }

      const doc = await fyo.doc.getDoc(ModelNameEnum.Account, account.name);
      this.setOpenAccountDocListener(doc, account);

      await commongDocDelete(doc, false);
    },
    async canDeleteAccount(account: AccountItem) {
      if (account.isGroup && !account.children?.length) {
        await this.fetchChildren(account);
      }

      if (!account.children?.length) {
        return true;
      }

      await showDialog({
        type: 'error',
        title: t`Cannot Delete Account`,
        detail: t`${account.name} has linked child accounts.`,
      });

      return false;
    },
    removeAccount(
      name: string,
      account?: AccountItem,
      parentAccount?: AccountItem
    ) {
      if (account == null && parentAccount == null) {
        return;
      }

      if (account == null && parentAccount) {
        account = parentAccount.children.find((ch) => ch?.name === name);
      }

      if (account == null) {
        return;
      }

      const indices = account.location.slice(1).map((i) => Number(i));

      let i = Number(account.location[0]);
      let parent = this.accounts[i];
      let children = this.accounts[i].children;

      while (indices.length > 1) {
        i = indices.shift()!;

        parent = children[i];
        children = children[i].children;
      }

      i = indices[0];

      if (children[i].name !== name) {
        return;
      }

      parent.children = removeAtIndex(children, i);
    },
    async toggleChildren(account: AccountItem) {
      const hasChildren = await this.fetchChildren(account);
      if (!hasChildren) {
        return false;
      }

      account.expanded = !account.expanded;
      if (!account.expanded) {
        account.addingAccount = false;
        account.addingGroupAccount = false;
      }

      return true;
    },
    async fetchChildren(account: AccountItem, force = false) {
      if (account.children == null || force) {
        account.children = await this.getChildren(account.name);
      }

      return !!account?.children?.length;
    },
    async getChildren(parent: null | string = null): Promise<AccountItem[]> {
      const children = await fyo.db.getAll(ModelNameEnum.Account, {
        filters: {
          parentAccount: parent,
        },
        fields: ['name', 'parentAccount', 'isGroup', 'rootType', 'accountType'],
        orderBy: 'name',
        order: 'asc',
      });

      return children.map((d) => {
        d.expanded = false;
        d.addingAccount = false;
        d.addingGroupAccount = false;

        return d as unknown as AccountItem;
      });
    },
    async addAccount(parentAccount: AccountItem, key: AccKey) {
      if (!parentAccount.expanded) {
        await this.fetchChildren(parentAccount);
        parentAccount.expanded = true;
      }
      // activate editing of type 'key' and deactivate other type
      let otherKey: AccKey =
        key === 'addingAccount' ? 'addingGroupAccount' : 'addingAccount';
      parentAccount[key] = true;
      parentAccount[otherKey] = false;

      await nextTick();
      let input = (this.$refs[parentAccount.name] as HTMLInputElement[])[0];
      input.focus();
    },
    cancelAddingAccount(parentAccount: AccountItem) {
      parentAccount.addingAccount = false;
      parentAccount.addingGroupAccount = false;
      this.newAccountName = '';
    },
    async createNewAccount(parentAccount: AccountItem, isGroup: boolean) {
      // freeze input
      this.insertingAccount = true;

      const accountName = this.newAccountName.trim();
      const doc = fyo.doc.getNewDoc('Account');
      try {
        let { name, rootType, accountType } = parentAccount;
        await doc.set({
          name: accountName,
          parentAccount: name,
          rootType,
          accountType,
          isGroup,
        });
        await doc.sync();

        // turn off editing
        parentAccount.addingAccount = false;
        parentAccount.addingGroupAccount = false;

        // update accounts
        await this.fetchChildren(parentAccount, true);

        // open quick edit
        await openQuickEdit({ doc });
        this.setOpenAccountDocListener(doc, undefined, parentAccount);

        // unfreeze input
        this.insertingAccount = false;
        this.newAccountName = '';
      } catch (e) {
        // unfreeze input
        this.insertingAccount = false;
        await handleErrorWithDialog(e, doc);
      }
    },
    isQuickEditOpen(account: AccountItem) {
      let { edit, schemaName, name } = this.$route.query;
      return !!(edit && schemaName === 'Account' && name === account.name);
    },
    getIconName(isGroup: boolean, name?: string): string {
      const icons: Record<string, string> = {
        'Application of Funds (Assets)': 'dock',
        Expenses: 'indian-rupee',
        Income: 'hand-coins',
        'Source of Funds (Liabilities)': 'wallet-cards',
      };

      if (name && icons[name]) return icons[name];
      return isGroup ? 'folder' : 'circle';
    },
    getItemStyle(level: number) {
      const styles: Record<string, string> = {
        height: 'calc(var(--h-row-mid) + 1px)',
      };
      if (this.languageDirection === 'rtl') {
        styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
      } else {
        styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
      }
      return styles;
    },
    getGroupStyle(level: number) {
      const styles: Record<string, string> = {
        height: 'height: calc(var(--h-row-mid) + 1px)',
      };
      if (this.languageDirection === 'rtl') {
        styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
      } else {
        styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
      }
      return styles;
    },
  },
});
</script>
