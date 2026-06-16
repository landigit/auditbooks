import {
  ref,
  computed,
  onMounted,
  onActivated,
  onDeactivated,
  nextTick,
  inject,
  Component,
  h,
} from 'vue';
import HugeiconsIcon from 'src/components/HugeiconsIcon.vue';
import {
  SafeIcon,
  Invoice02Icon,
  Money01Icon,
  CreditCardIcon,
  Folder01Icon,
} from 'src/assets/icons/hugeicons';
import { useRoute } from 'vue-router';
import { t } from 'fyo';
import { isCredit } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { commongDocDelete, openQuickEdit } from 'src/utils/ui';
import { getMapFromList, removeAtIndex } from 'utils/index';
import { handleErrorWithDialog } from 'src/errorHandling';
import { AccountRootType, AccountType } from 'models/baseModels/Account/types';
import { TreeViewSettings } from 'fyo/model/types';
import { Doc } from 'fyo/model/doc';
import { uicolors } from 'src/utils/colors';
import { showDialog } from 'src/utils/interactive';

export type AccountItem = {
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

export type AccKey = 'addingAccount' | 'addingGroupAccount';

export function useChartOfAccounts(props: { darkMode: boolean }) {
  const route = useRoute();
  const languageDirection = inject(languageDirectionKey);

  const isAllCollapsed = ref(true);
  const isAllExpanded = ref(false);
  const root = ref<null | { label: string; balance: number; currency: string }>(
    null
  );
  const accounts = ref<AccountItem[]>([]);
  const schemaName = 'Account';
  const newAccountName = ref('');
  const insertingAccount = ref(false);
  const totals = ref<
    Record<string, { totalDebit: number; totalCredit: number }>
  >({});
  const refetchTotals = ref(false);
  const settings = ref<null | TreeViewSettings>(null);

  const allAccounts = computed<AccountItem[]>(() => {
    const list: AccountItem[] = [];

    (function getAccounts(
      items: AccountItem[],
      level: number,
      location: number[]
    ) {
      for (let i = 0; i < items.length; i++) {
        const account = items[i];

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

  onMounted(async () => {
    await setTotalDebitAndCredit();
    fyo.doc.observer.on('sync:AccountingLedgerEntry', () => {
      refetchTotals.value = true;
    });
  });

  onActivated(async () => {
    await fetchAccounts();
    if (fyo.store.isDevelopment) {
      // @ts-ignore
      window.coa = {
        isAllCollapsed,
        isAllExpanded,
        root,
        accounts,
        newAccountName,
        insertingAccount,
        totals,
        refetchTotals,
        settings,
        expand,
        collapse,
        fetchAccounts,
      };
    }

    docsPathRef.value = docsPathMap.ChartOfAccounts!;

    if (refetchTotals.value) {
      await setTotalDebitAndCredit();
      refetchTotals.value = false;
    }
  });

  onDeactivated(() => {
    docsPathRef.value = '';
  });

  async function expand() {
    await toggleAll(accounts.value, true);
    isAllCollapsed.value = false;
    isAllExpanded.value = true;
  }

  async function collapse() {
    await toggleAll(accounts.value, false);
    isAllExpanded.value = false;
    isAllCollapsed.value = true;
  }

  async function toggleAll(
    items: AccountItem | AccountItem[],
    expandFlag: boolean
  ) {
    if (!Array.isArray(items)) {
      await toggle(items, expandFlag);
      items = items.children ?? [];
    }

    for (const account of items) {
      await toggleAll(account, expandFlag);
    }
  }

  async function toggle(account: AccountItem, expandFlag: boolean) {
    if (account.expanded === expandFlag || !account.isGroup) {
      return;
    }

    await toggleChildren(account);
  }

  function getBalance(account: AccountItem) {
    const total = totals.value[account.name];
    if (!total) {
      return 0;
    }

    const { totalCredit, totalDebit } = total;

    if (isCredit(account.rootType)) {
      return totalCredit - totalDebit;
    }

    return totalDebit - totalCredit;
  }

  function getBalanceString(account: AccountItem) {
    const suffix = isCredit(account.rootType) ? t`Cr.` : t`Dr.`;
    const balance = getBalance(account);
    return `${fyo.format(balance, 'Currency')} ${suffix}`;
  }

  async function setTotalDebitAndCredit() {
    const res = await fyo.db.getTotalCreditAndDebit();
    totals.value = getMapFromList(res, 'account');
  }

  async function fetchAccounts() {
    settings.value =
      fyo.models[ModelNameEnum.Account]?.getTreeSettings(fyo) ?? null;
    const currency = fyo.singles.SystemSettings?.currency ?? '';
    const labelVal = (await settings.value?.getRootLabel()) ?? '';

    root.value = {
      label: labelVal,
      balance: 0,
      currency,
    };
    accounts.value = await getChildren();
  }

  async function onClick(account: AccountItem) {
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
  }

  function setOpenAccountDocListener(
    doc: Doc,
    account?: AccountItem,
    parentAccount?: AccountItem
  ) {
    if (doc.hasListener('afterDelete')) {
      return;
    }

    doc.once('afterDelete', () => {
      removeAccount(doc.name!, account, parentAccount);
    });
  }

  async function deleteAccount(account: AccountItem) {
    const canDel = await canDeleteAccount(account);
    if (!canDel) {
      return;
    }

    const doc = await fyo.doc.getDoc(ModelNameEnum.Account, account.name);
    setOpenAccountDocListener(doc, account);

    await commongDocDelete(doc, false);
  }

  async function canDeleteAccount(account: AccountItem) {
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
  }

  function removeAccount(
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
  }

  async function toggleChildren(account: AccountItem) {
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
  }

  async function fetchChildren(account: AccountItem, force = false) {
    if (account.children == null || force) {
      account.children = await getChildren(account.name);
    }

    return !!account?.children?.length;
  }

  async function getChildren(
    parent: null | string = null
  ): Promise<AccountItem[]> {
    const childrenList = await fyo.db.getAll(ModelNameEnum.Account, {
      filters: {
        parentAccount: parent,
      },
      fields: ['name', 'parentAccount', 'isGroup', 'rootType', 'accountType'],
      orderBy: 'name',
      order: 'asc',
    });

    return childrenList.map((d) => {
      d.expanded = false;
      d.addingAccount = false;
      d.addingGroupAccount = false;

      return d as unknown as AccountItem;
    });
  }

  async function addAccount(
    parentAccount: AccountItem,
    key: AccKey,
    inputs: Record<string, HTMLInputElement[]>
  ) {
    if (!parentAccount.expanded) {
      await fetchChildren(parentAccount);
      parentAccount.expanded = true;
    }
    const otherKey: AccKey =
      key === 'addingAccount' ? 'addingGroupAccount' : 'addingAccount';
    parentAccount[key] = true;
    parentAccount[otherKey] = false;

    await nextTick();
    const input = inputs[parentAccount.name]?.[0];
    if (input) {
      input.focus();
    }
  }

  function cancelAddingAccount(parentAccount: AccountItem) {
    parentAccount.addingAccount = false;
    parentAccount.addingGroupAccount = false;
    newAccountName.value = '';
  }

  async function createNewAccount(
    parentAccount: AccountItem,
    isGroupFlag: boolean
  ) {
    insertingAccount.value = true;

    const accountName = newAccountName.value.trim();
    const doc = fyo.doc.getNewDoc('Account');
    try {
      const { name, rootType, accountType } = parentAccount;
      await doc.set({
        name: accountName,
        parentAccount: name,
        rootType,
        accountType,
        isGroup: isGroupFlag,
      });
      await doc.sync();

      parentAccount.addingAccount = false;
      parentAccount.addingGroupAccount = false;

      await fetchChildren(parentAccount, true);

      await openQuickEdit({ doc });
      setOpenAccountDocListener(doc, undefined, parentAccount);

      insertingAccount.value = false;
      newAccountName.value = '';
    } catch (e) {
      insertingAccount.value = false;
      await handleErrorWithDialog(e, doc);
    }
  }

  function isQuickEditOpen(account: AccountItem, query: any) {
    const { edit, schemaName: querySchemaName, name } = query;
    return !!(edit && querySchemaName === 'Account' && name === account.name);
  }

  function getIconComponent(isGroupFlag: boolean, name?: string): Component {
    const icons: Record<string, any> = {
      'Application of Funds (Assets)': SafeIcon,
      Expenses: Invoice02Icon,
      Income: Money01Icon,
      'Source of Funds (Liabilities)': CreditCardIcon,
    };

    if (name && icons[name]) {
      return (props: any, { attrs }: any) =>
        h(HugeiconsIcon, {
          icon: icons[name],
          class: 'w-4 h-4 text-gray-700 dark:text-gray-300',
          strokeWidth: 1.8,
          ...attrs,
        });
    }

    if (isGroupFlag) {
      return (props: any, { attrs }: any) =>
        h(HugeiconsIcon, {
          icon: Folder01Icon,
          class: 'w-4 h-4 text-gray-500 dark:text-gray-400',
          strokeWidth: 1.8,
          ...attrs,
        });
    }

    // Default leaf
    return (props: any, { attrs }: any) =>
      h(
        'div',
        {
          class: 'w-4 h-4 flex items-center justify-center',
          ...attrs,
        },
        [
          h('div', {
            class: 'w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600',
          }),
        ]
      );
  }

  function getItemStyle(level: number) {
    const styles: Record<string, string> = {
      height: 'calc(var(--h-row-mid) + 1px)',
    };
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
    } else {
      styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
    }
    return styles;
  }

  function getGroupStyle(level: number) {
    const styles: Record<string, string> = {
      height: 'height: calc(var(--h-row-mid) + 1px)',
    };
    if (languageDirection?.value === 'rtl') {
      styles['padding-right'] = `calc(1rem + 2rem * ${level})`;
    } else {
      styles['padding-left'] = `calc(1rem + 2rem * ${level})`;
    }
    return styles;
  }

  return {
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
    expand,
    collapse,
    toggleAll,
    toggle,
    getBalance,
    getBalanceString,
    setTotalDebitAndCredit,
    fetchAccounts,
    onClick,
    setOpenAccountDocListener,
    deleteAccount,
    canDeleteAccount,
    removeAccount,
    toggleChildren,
    fetchChildren,
    getChildren,
    addAccount,
    cancelAddingAccount,
    createNewAccount,
    isQuickEditOpen,
    getIconComponent,
    getItemStyle,
    getGroupStyle,
  };
}
