import { ref, computed, onMounted, onActivated, onDeactivated, nextTick, inject, Component } from 'vue';
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
  const root = ref<null | { label: string; balance: number; currency: string }>(null);
  const accounts = ref<AccountItem[]>([]);
  const schemaName = 'Account';
  const newAccountName = ref('');
  const insertingAccount = ref(false);
  const totals = ref<Record<string, { totalDebit: number; totalCredit: number }>>({});
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

  async function toggleAll(items: AccountItem | AccountItem[], expandFlag: boolean) {
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

  async function getChildren(parent: null | string = null): Promise<AccountItem[]> {
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

  async function addAccount(parentAccount: AccountItem, key: AccKey, inputs: Record<string, HTMLInputElement[]>) {
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

  async function createNewAccount(parentAccount: AccountItem, isGroupFlag: boolean) {
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
    const lightColor = props.darkMode ? uicolors.gray[600] : uicolors.gray[400];
    const darkColor = props.darkMode ? uicolors.gray[400] : uicolors.gray[700];
    const icons = {
      'Application of Funds (Assets)': `<svg class="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fill-rule="evenodd">
            <path d="M15.333 5.333H.667A.667.667 0 000 6v9.333c0 .368.299.667.667.667h14.666a.667.667 0 00.667-.667V6a.667.667 0 00-.667-.667zM8 12.667a2 2 0 110-4 2 2 0 010 4z" fill="${darkColor}" fill-rule="nonzero"/>
            <path d="M14 2.667V4H2V2.667h12zM11.333 0v1.333H4.667V0h6.666z" fill="${lightColor}"/>
          </g>
        </svg>`,
      Expenses: `<svg class="w-4 h-4" viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.668 0v15.333a.666.666 0 01-.666.667h-12a.666.666 0 01-.667-.667V0l2.667 2 2-2 2 2 2-2 2 2 2.666-2zM9.964 4.273H4.386l-.311 1.133h1.62c.933 0 1.474.362 1.67.963H4.373l-.298 1.053h3.324c-.175.673-.767 1.044-1.705 1.044H4.182l.008.83L7.241 13h1.556v-.072L6.01 9.514c1.751-.106 2.574-.942 2.748-2.092h.904l.298-1.053H8.75a2.375 2.375 0 00-.43-1.044l1.342.009.302-1.061z" fill="${darkColor}" fill-rule="evenodd"/>
        </svg>`,
      Income: `<svg class="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fill-rule="evenodd">
            <path d="M16 12.859V14c0 1.105-2.09 2-4.667 2-2.494 0-4.531-.839-4.66-1.894L6.667 14v-1.141C7.73 13.574 9.366 14 11.333 14c1.968 0 3.602-.426 4.667-1.141zm0-3.334v1.142c0 1.104-2.09 2-4.667 2-2.494 0-4.531-.839-4.66-1.894l-.006-.106V9.525c1.064.716 2.699 1.142 4.666 1.142 1.968 0 3.602-.426 4.667-1.142zm-4.667-4.192c2.578 0 4.667.896 4.667 2 0 1.105-2.09 2-4.667 2s-4.666-.895-4.666-2c0-1.104 2.089-2 4.666-2z" fill="${darkColor}"/>
            <path d="M0 10.859C1.065 11.574 2.7 12 4.667 12l.337-.005.33-.013v1.995c-.219.014-.44.023-.667.023-2.495 0-4.532-.839-4.66-1.894L0 12v-1.141zm0-2.192V7.525c1.065.716 2.7 1.142 4.667 1.142l.337-.005.33-.013v1.995c-.219.013-.44.023-.667.023-2.495 0-4.532-.839-4.66-1.894L0 8.667V7.525zm0-4.475c1.065.715 2.7 1.141 4.667 1.141.694 0 1.345-.056 1.946-.156-.806.56-1.27 1.292-1.278 2.134-.219.013-.441.022-.668.022-2.578 0-4.667-.895-4.667-2zM4.667 0c2.577 0 4.666.895 4.666 2S7.244 4 4.667 4C2.089 4 0 3.105 0 2s2.09-2 4.667-2z" fill="${lightColor}"/>
          </g>
        </svg>`,
      'Source of Funds (Liabilities)': `<svg class="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fill-rule="evenodd">
            <path d="M7.332 11.36l4.666-3.734 2 1.6V.666A.667.667 0 0013.332 0h-12a.667.667 0 00-.667.667v14.666c0 .369.298.667.667.667h6v-4.64zm-4-7.36H11.3v1.333H3.332V4zm2.666 8H3.332v-1.333h2.666V12zM3.332 8.667V7.333h5.333v1.334H3.332z" fill="${darkColor}"/>
            <path d="M15.332 12l-3.334-2.667L8.665 12v3.333c0 .369.298.667.667.667h2v-2h1.333v2h2a.667.667 0 00.667-.667V12z" fill="${lightColor}"/>
          </g>
        </svg>`,
    };

    const leaf = `<svg class="w-2 h-2" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
      <circle stroke="${darkColor}" cx="4" cy="4" r="3.5" fill="none" fill-rule="evenodd"/>
    </svg>`;

    const folder = `<svg class="w-3 h-3" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.333 3.367L6.333.7H.667A.667.667 0 000 1.367v12a2 2 0 002 2h12a2 2 0 002-2V4.033a.667.667 0 00-.667-.666h-7z" fill="${darkColor}" fill-rule="evenodd"/>
    </svg>`;

    const icon = isGroupFlag ? folder : leaf;

    return {
      template: icons[name as keyof typeof icons] || icon,
    };
  }

  function getItemStyle(level: number) {
    const styles: Record<string, string> = {
      height: 'calc(var(--h-row-mid) + 1px)',
    };
    if (languageDirection === 'rtl') {
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
    if (languageDirection === 'rtl') {
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
