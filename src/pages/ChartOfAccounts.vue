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
          class="py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-890 dark:text-gray-25 group flex items-center border-b dark:border-gray-800 flex-shrink-0 pe-4"
          :class="[
            account.level !== 0 ? 'text-base' : 'text-lg',
            isQuickEditOpen(account, $route.query) ? 'bg-gray-200 dark:bg-gray-900' : '',
          ]"
          :style="getItemStyle(account.level)"
          @click="onClick(account)"
        >
          <component :is="getIconComponent(!!account.isGroup, account.name)" />
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
                class="text-xs text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                @click.stop="addAccount(account, 'addingAccount', inputs)"
              >
                {{ t`Add Account` }}
              </button>
              <button
                v-if="account.isGroup"
                class="ms-3 text-xs text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                @click.stop="addAccount(account, 'addingGroupAccount', inputs)"
              >
                {{ t`Add Group` }}
              </button>
              <button
                class="ms-3 text-xs text-gray-800 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                @click.stop="deleteAccount(account)"
              >
                {{ account.isGroup ? t`Delete Group` : t`Delete Account` }}
              </button>
            </div>
          </div>

          <!-- Account Balance String -->
          <p
            v-if="!account.isGroup"
            class="ms-auto text-base text-gray-800 dark:text-gray-400"
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
              :ref="el => setInputRef(el as HTMLInputElement | null, account.name)"
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
