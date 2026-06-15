<template>
  <div class="flex flex-col h-full">
    <PageHeader :title="t`Chart of Accounts`">
      <Button v-if="!isAllExpanded" @click="expand">
        <feather-icon name="chevrons-down" class="w-4 h-4 me-1.5" />
        {{ t`Expand` }}
      </Button>
      <Button v-if="!isAllCollapsed" @click="collapse">
        <feather-icon name="chevrons-up" class="w-4 h-4 me-1.5" />
        {{ t`Collapse` }}
      </Button>
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
          class="py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-890 dark:text-gray-25 group flex items-center border-b dark:border-gray-800 flex-shrink-0 pe-4 transition-colors"
          :class="[
            account.level !== 0 ? 'text-base' : 'text-lg',
            isQuickEditOpen(account, $route.query)
              ? 'bg-gray-200 dark:bg-gray-900'
              : '',
          ]"
          :style="getItemStyle(account.level)"
          @click="onClick(account)"
        >
          <!-- Chevron to show expand/collapse state -->
          <span
            class="w-4 h-4 flex items-center justify-center me-1 flex-shrink-0"
          >
            <feather-icon
              v-if="account.isGroup"
              :name="account.expanded ? 'chevron-down' : 'chevron-right'"
              class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
            />
          </span>

          <component
            :is="getIconComponent(!!account.isGroup, account.name)"
            class="flex-shrink-0"
          />
          <div class="flex items-center flex-1 min-w-0">
            <div
              class="ms-4 truncate"
              :class="[
                !account.parentAccount &&
                  'font-semibold text-gray-900 dark:text-gray-100',
              ]"
            >
              {{ account.name }}
            </div>

            <!-- Add Account Buttons on Group Hover -->
            <div class="ms-6 hidden group-hover:flex items-center gap-2">
              <button
                v-if="account.isGroup"
                class="px-2 py-0.5 text-[11px] font-medium border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 shadow-sm transition flex items-center focus:outline-none"
                @click.stop="addAccount(account, 'addingAccount', inputs)"
              >
                <feather-icon name="plus" class="w-3 h-3 me-1" />
                {{ t`Add Account` }}
              </button>
              <button
                v-if="account.isGroup"
                class="px-2 py-0.5 text-[11px] font-medium border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 shadow-sm transition flex items-center focus:outline-none"
                @click.stop="addAccount(account, 'addingGroupAccount', inputs)"
              >
                <feather-icon name="folder-plus" class="w-3 h-3 me-1" />
                {{ t`Add Group` }}
              </button>
              <button
                class="px-2 py-0.5 text-[11px] font-medium border border-red-200 dark:border-red-950 text-red-600 dark:text-red-400 rounded-md bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 shadow-sm transition flex items-center focus:outline-none"
                @click.stop="deleteAccount(account)"
              >
                <feather-icon name="trash-2" class="w-3 h-3 me-1" />
                {{ account.isGroup ? t`Delete Group` : t`Delete Account` }}
              </button>
            </div>
          </div>

          <!-- Account Balance String -->
          <p
            v-if="!account.isGroup"
            class="ms-auto text-base text-gray-800 dark:text-gray-400 font-medium"
          >
            {{ getBalanceString(account) }}
          </p>
        </div>

        <!-- Add Account/Group -->
        <div
          v-if="account.addingAccount || account.addingGroupAccount"
          :key="account.name + '-adding-account'"
          class="px-4 border-b dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-890 group flex items-center text-base"
          :style="getGroupStyle(account.level + 1)"
        >
          <component :is="getIconComponent(account.addingGroupAccount)" />
          <div class="flex ms-4 h-row-mid items-center">
            <input
              :ref="
                (el) => setInputRef(el as HTMLInputElement | null, account.name)
              "
              v-model="newAccountName"
              class="focus:outline-none bg-transparent dark:placeholder-gray-600 dark:text-gray-400"
              :class="{ 'text-gray-600 dark:text-gray-400': insertingAccount }"
              :placeholder="t`New Account`"
              type="text"
              :disabled="insertingAccount"
              @keydown.esc="cancelAddingAccount(account)"
              @keydown.enter="
                () => createNewAccount(account, account.addingGroupAccount)
              "
            />
            <button
              v-if="!insertingAccount"
              class="ms-4 text-xs text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
              @click="
                () => createNewAccount(account, account.addingGroupAccount)
              "
            >
              {{ t`Save` }}
            </button>
            <button
              v-if="!insertingAccount"
              class="ms-4 text-xs text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
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

<script setup lang="ts">
import { ref } from 'vue';
import { useApp } from 'src/composables/useApp.js';
import Button from '../components/Button.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { useChartOfAccounts } from '../composables/useChartOfAccounts.js';

const { t } = useApp();

const props = withDefaults(
  defineProps<{
    darkMode?: boolean;
  }>(),
  {
    darkMode: false,
  }
);

const {
  isAllCollapsed,
  isAllExpanded,
  root,
  newAccountName,
  insertingAccount,
  allAccounts,
  expand,
  collapse,
  getBalanceString,
  onClick,
  deleteAccount,
  addAccount,
  cancelAddingAccount,
  createNewAccount,
  isQuickEditOpen,
  getIconComponent,
  getItemStyle,
  getGroupStyle,
} = useChartOfAccounts(props);

const inputs = ref<Record<string, HTMLInputElement[]>>({});
function setInputRef(el: HTMLInputElement | null, name: string) {
  if (el) {
    if (!inputs.value[name]) {
      inputs.value[name] = [];
    }
    if (!inputs.value[name].includes(el)) {
      inputs.value[name].push(el);
    }
  }
}
</script>
