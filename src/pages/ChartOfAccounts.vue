<template>
  <view v-if="!isLynx">
    <view class="flex flex-col h-full">
      <PageHeader :title="t`Chart of Accounts`">
        <Button v-if="!isAllExpanded" @tap="expand">{{ t`Expand` }}</Button>
        <Button v-if="!isAllCollapsed" @tap="collapse">{{
          t`Collapse`
        }}</Button>
      </PageHeader>

      <!-- Chart of Accounts -->
      <view
        v-if="root"
        class="flex-1 flex flex-col overflow-y-auto mb-4 custom-scroll custom-scroll-thumb1"
      >
        <!-- Chart of Accounts Indented List -->
        <template v-for="account in allAccounts" :key="account.name">
          <!-- Account List Item -->
          <view
            class="py-2 cursor-pointer hover:bg-surface-hover text-main group flex items-center border-b border-border flex-shrink-0 pe-4"
            :class="[
              account.level !== 0 ? 'text-base' : 'text-lg',
              isQuickEditOpen(account) ? 'bg-canvas-muted' : '',
            ]"
            :style="getItemStyle(account.level)"
            @tap="onClick(account)"
          >
            <LucideIcon
              :name="getIconName(!!account.isGroup, account.name)"
              :size="account.isGroup ? 20 : 16"
              class="text-description group-hover:text-main transition-colors"
            />
            <view class="flex items-baseline">
              <view
                class="ms-4"
                :class="[!account.parentAccount && 'font-semibold']"
              >
                {{ account.name }}
              </view>

              <!-- Add Account Buttons on Group Hover (Horizontal Layout) -->
              <view class="ms-6 hidden group-hover:flex flex-row items-center">
                <view
                  v-if="account.isGroup"
                  class="text-xs text-description hover:text-main focus:outline-none"
                  @tap.stop="addAccount(account, 'addingAccount')"
                >
                  {{ t`Add Account` }}
                </view>
                <view
                  v-if="account.isGroup"
                  class="ms-3 text-xs text-description hover:text-main focus:outline-none"
                  @tap.stop="addAccount(account, 'addingGroupAccount')"
                >
                  {{ t`Add Group` }}
                </view>
                <view
                  class="ms-3 text-xs text-description hover:text-main focus:outline-none"
                  @tap.stop="deleteAccount(account)"
                >
                  {{ account.isGroup ? t`Delete Group` : t`Delete Account` }}
                </view>
              </view>
            </view>

            <!-- Account Balance String -->
            <text
              v-if="!account.isGroup"
              class="ms-auto text-base text-description"
            >
              {{ getBalanceString(account) }}
            </text>
          </view>

          <!-- Add Account/Group -->
          <view
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
            <view class="flex ms-4 h-row-mid items-center">
              <input
                :ref="(el) => setInputRef(el, account.name)"
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
              <view
                v-if="!insertingAccount"
                class="ms-4 text-xs text-description hover:text-main focus:outline-none"
                @tap="createNewAccount(account, account.addingGroupAccount)"
              >
                {{ t`Save` }}
              </view>
              <view
                v-if="!insertingAccount"
                class="ms-4 text-xs text-description hover:text-main focus:outline-none"
                @tap="cancelAddingAccount(account)"
              >
                {{ t`Cancel` }}
              </view>
            </view>
          </view>
        </template>
      </view>
    </view>
  </view>
  <view v-else class="flex flex-col h-full bg-canvas">
    <!-- Native Header -->
    <PageHeader :title="t`Chart of Accounts`">
      <view class="flex flex-row gap-2">
        <view
          class="px-3 py-1.5 rounded bg-surface border border-border cursor-pointer active:opacity-75"
          @tap="expand"
        >
          <text class="text-xs text-main font-medium">{{ t`Expand` }}</text>
        </view>
        <view
          class="px-3 py-1.5 rounded bg-surface border border-border cursor-pointer active:opacity-75"
          @tap="collapse"
        >
          <text class="text-xs text-main font-medium">{{ t`Collapse` }}</text>
        </view>
      </view>
    </PageHeader>

    <scroll-view v-if="root" scroll-y="true" class="flex-1 px-4 py-2">
      <template v-for="account in allAccounts" :key="account.name">
        <!-- Native Account Row -->
        <view
          class="py-3 flex flex-row items-center border-b border-border"
          :style="getItemStyle(account.level)"
        >
          <!-- Folder / File Emoji Indicator -->
          <text class="text-lg mr-2 cursor-pointer" @tap="onClick(account)">
            {{ account.isGroup ? (account.expanded ? '📂' : '📁') : '⚪' }}
          </text>

          <view
            class="flex-1 flex flex-row justify-between items-center cursor-pointer"
            @tap="onClick(account)"
          >
            <view class="flex flex-col">
              <text
                class="text-sm text-main"
                :class="{ 'font-semibold': !account.parentAccount }"
              >
                {{ account.name }}
              </text>
              <text
                v-if="!account.isGroup"
                class="text-[10px] text-description mt-0.5"
              >
                {{ getBalanceString(account) }}
              </text>
            </view>
          </view>

          <!-- Native Action Menu for Groups/Accounts (Premium Pill Buttons) -->
          <view class="flex flex-row gap-1.5 ml-4">
            <view
              v-if="account.isGroup"
              class="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 active:opacity-70 cursor-pointer"
              @tap="addAccount(account, 'addingAccount')"
            >
              <text class="text-[10px] font-semibold text-blue-600"
                >+ Account</text
              >
            </view>
            <view
              v-if="account.isGroup"
              class="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 active:opacity-70 cursor-pointer"
              @tap="addAccount(account, 'addingGroupAccount')"
            >
              <text class="text-[10px] font-semibold text-emerald-600"
                >+ Group</text
              >
            </view>
            <view
              class="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 active:opacity-70 cursor-pointer"
              @tap="deleteAccount(account)"
            >
              <text class="text-[10px] font-semibold text-red-600">Delete</text>
            </view>
          </view>
        </view>

        <!-- Inline Adding Input (Styled) -->
        <view
          v-if="account.addingAccount || account.addingGroupAccount"
          :key="account.name + '-adding-account'"
          class="py-3 border-b border-border flex flex-row items-center"
          :style="getGroupStyle(account.level + 1)"
        >
          <text class="text-lg mr-2">{{
            account.addingGroupAccount ? '📁' : '⚪'
          }}</text>
          <input
            :ref="(el) => setInputRef(el, account.name)"
            v-model="newAccountName"
            class="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm text-main placeholder-description"
            :placeholder="t`New Account Name`"
            type="text"
            :disabled="insertingAccount"
          />
          <view class="flex flex-row gap-2 ml-2">
            <view
              class="px-3 py-1.5 rounded bg-blue-600 active:opacity-80 cursor-pointer"
              @tap="createNewAccount(account, account.addingGroupAccount)"
            >
              <text class="text-xs text-white font-medium">Save</text>
            </view>
            <view
              class="px-3 py-1.5 rounded bg-surface border border-border active:opacity-75 cursor-pointer"
              @tap="cancelAddingAccount(account)"
            >
              <text class="text-xs text-main font-medium">Cancel</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>
<script setup lang="ts">
import {
  ref,
  computed,
  inject,
  nextTick,
  onMounted,
  onActivated,
  onDeactivated,
} from 'vue';
import { useRoute } from 'vue-router';
import router from 'src/router';
import { isLynx } from 'src/utils/interactive';
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

// Router & App Store
const route = useRoute();
const store = useAppStore();
const languageDirection = inject(languageDirectionKey);

// Dynamic Input Refs Map
const inputRefs = ref<Record<string, HTMLInputElement>>({});
const setInputRef = (el: any, name: string) => {
  if (el) {
    inputRefs.value[name] = el;
  }
};

// Reactive State definitions
const isAllCollapsed = ref(true);
const isAllExpanded = ref(false);
const root = ref<null | { label: string; balance: number; currency: string }>(
  null
);
const accounts = ref<AccountItem[]>([]);
const schemaName = ref('Account');
const newAccountName = ref('');
const insertingAccount = ref(false);
const totals = ref<
  Record<string, { totalCredit: number; totalDebit: number } | undefined>
>({});
const refetchTotals = ref(false);
const settings = ref<null | TreeViewSettings>(null);

// Computed attributes
const allAccounts = computed(() => {
  const list: AccountItem[] = [];

  (function getAccounts(
    accs: AccountItem[],
    level: number,
    location: number[]
  ) {
    for (let i = 0; i < accs.length; i++) {
      const account = accs[i];

      account.level = level;
      account.location = [...location, i];
      list.push(account);

      if (account.children != null && account.expanded) {
        getAccounts(account.children, level + 1, account.location);
      }
    }
  })(accounts.value, 0, []);

  return list;
});

// Methods
const getBalance = (account: AccountItem) => {
  const total = totals.value[account.name];
  if (!total) {
    return 0;
  }

  const { totalCredit, totalDebit } = total;

  if (isCredit(account.rootType)) {
    return totalCredit - totalDebit;
  }

  return totalDebit - totalCredit;
};

const getBalanceString = (account: AccountItem) => {
  const suffix = isCredit(account.rootType) ? t`Cr.` : t`Dr.`;
  const balance = getBalance(account);
  return `${fyo.format(balance, 'Currency')} ${suffix}`;
};

const setTotalDebitAndCredit = async () => {
  const totalsList = await fyo.db.getTotalCreditAndDebit();
  totals.value = getMapFromList(totalsList, 'account');
};

const getChildren = async (
  parent: null | string = null
): Promise<AccountItem[]> => {
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
};

const fetchAccounts = async () => {
  settings.value =
    fyo.models[ModelNameEnum.Account]?.getTreeSettings(fyo) ?? null;
  const currency = fyo.singles.SystemSettings?.currency ?? '';
  const label = (await settings.value?.getRootLabel()) ?? '';

  root.value = {
    label,
    balance: 0,
    currency,
  };
  accounts.value = await getChildren();
};

const fetchChildren = async (account: AccountItem, force = false) => {
  if (account.children == null || force) {
    account.children = await getChildren(account.name);
  }

  return !!account?.children?.length;
};

const toggleChildren = async (account: AccountItem) => {
  const hasChildren = await fetchChildren(account);
  if (!hasChildren) {
    return false;
  }

  account.expanded = !account.expanded;
  if (!account.expanded) {
    account.addingAccount = false;
    account.addingGroupAccount = false;
  }

  return true;
};

const toggle = async (account: AccountItem, expand: boolean) => {
  if (account.expanded === expand || !account.isGroup) {
    return;
  }

  await toggleChildren(account);
};

const toggleAll = async (
  accs: AccountItem | AccountItem[],
  expand: boolean
) => {
  if (!Array.isArray(accs)) {
    await toggle(accs, expand);
    accs = accs.children ?? [];
  }

  for (const account of accs) {
    await toggleAll(account, expand);
  }
};

const expand = async () => {
  await toggleAll(accounts.value, true);
  isAllCollapsed.value = false;
  isAllExpanded.value = true;
};

const collapse = async () => {
  await toggleAll(accounts.value, false);
  isAllExpanded.value = false;
  isAllCollapsed.value = true;
};

const removeAccount = (
  name: string,
  account?: AccountItem,
  parentAccount?: AccountItem
) => {
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
  let parent = accounts.value[i];
  let children = accounts.value[i].children;

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
};

const setOpenAccountDocListener = (
  doc: Doc,
  account?: AccountItem,
  parentAccount?: AccountItem
) => {
  if (doc.hasListener('afterDelete')) {
    return;
  }

  doc.once('afterDelete', () => {
    removeAccount(doc.name!, account, parentAccount);
  });
};

const onClick = async (account: AccountItem) => {
  let shouldOpen = !account.isGroup;
  if (account.isGroup) {
    shouldOpen = !(await toggleChildren(account));
  }

  if (account.isGroup && account.expanded) {
    isAllCollapsed.value = false;
  }

  if (account.isGroup && !account.expanded) {
    isAllExpanded.value = false;
  }

  if (!shouldOpen) {
    return;
  }

  const doc = await fyo.doc.getDoc(ModelNameEnum.Account, account.name);
  setOpenAccountDocListener(doc, account);
  await openQuickEdit({ doc });
};

const canDeleteAccount = async (account: AccountItem) => {
  if (account.isGroup && !account.children?.length) {
    await fetchChildren(account);
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
};

const deleteAccount = async (account: AccountItem) => {
  const canDel = await canDeleteAccount(account);
  if (!canDel) {
    return;
  }

  const doc = await fyo.doc.getDoc(ModelNameEnum.Account, account.name);
  setOpenAccountDocListener(doc, account);

  await commongDocDelete(doc, false);
};

const addAccount = async (parentAccount: AccountItem, key: AccKey) => {
  if (!parentAccount.expanded) {
    await fetchChildren(parentAccount);
    parentAccount.expanded = true;
  }
  // activate editing of type 'key' and deactivate other type
  let otherKey: AccKey =
    key === 'addingAccount' ? 'addingGroupAccount' : 'addingAccount';
  parentAccount[key] = true;
  parentAccount[otherKey] = false;

  await nextTick();
  const input = inputRefs.value[parentAccount.name];
  input?.focus();
};

const cancelAddingAccount = (parentAccount: AccountItem) => {
  parentAccount.addingAccount = false;
  parentAccount.addingGroupAccount = false;
  newAccountName.value = '';
};

const createNewAccount = async (
  parentAccount: AccountItem,
  isGroup: boolean
) => {
  insertingAccount.value = true;

  const accountName = newAccountName.value.trim();
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
    await fetchChildren(parentAccount, true);

    // open quick edit
    await openQuickEdit({ doc });
    setOpenAccountDocListener(doc, undefined, parentAccount);

    // unfreeze input
    insertingAccount.value = false;
    newAccountName.value = '';
  } catch (e) {
    // unfreeze input
    insertingAccount.value = false;
    await handleErrorWithDialog(e, doc);
  }
};

const isQuickEditOpen = (account: AccountItem) => {
  const query = isLynx
    ? router.currentRoute.value.params || {}
    : route?.query || {};
  const { edit, schemaName, name } = query;
  return !!(edit && schemaName === 'Account' && name === account.name);
};

const getIconName = (isGroup: boolean, name?: string): string => {
  const icons: Record<string, string> = {
    'Application of Funds (Assets)': 'dock',
    Expenses: 'indian-rupee',
    Income: 'hand-coins',
    'Source of Funds (Liabilities)': 'wallet-cards',
  };

  if (name && icons[name]) return icons[name];
  return isGroup ? 'folder' : 'circle';
};

const getItemStyle = (level: number) => {
  const styles: Record<string, string> = {
    height: 'calc(var(--h-row-mid) + 1px)',
  };
  if (languageDirection?.value === 'rtl') {
    styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
  } else {
    styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
  }
  return styles;
};

const getGroupStyle = (level: number) => {
  const styles: Record<string, string> = {
    height: 'calc(var(--h-row-mid) + 1px)',
  };
  if (languageDirection?.value === 'rtl') {
    styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
  } else {
    styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
  }
  return styles;
};

// Lifecycles
onMounted(async () => {
  await setTotalDebitAndCredit();
  fyo.doc.observer.on('sync:AccountingLedgerEntry', () => {
    refetchTotals.value = true;
  });
});

onActivated(async () => {
  await fetchAccounts();
  if (typeof window !== 'undefined' && store.isDevelopment) {
    // @ts-expect-error
    window.coa = {
      isAllCollapsed,
      isAllExpanded,
      root,
      accounts,
      schemaName,
      newAccountName,
      insertingAccount,
      totals,
      refetchTotals,
      settings,
      allAccounts,
    };
  }

  store.docsPath = docsPathMap.ChartOfAccounts!;

  if (refetchTotals.value) {
    await setTotalDebitAndCredit();
    refetchTotals.value = false;
  }
});

onDeactivated(() => {
  store.docsPath = '';
});
</script>
