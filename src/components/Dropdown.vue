<template>
  <Popover
    :show-popup="isShown"
    :hide-arrow="true"
    :placement="right ? 'bottom-end' : 'bottom-start'"
  >
    <template #target>
      <div v-on-outside-click="() => (isShown = false)" class="h-full">
        <slot
          :toggle-dropdown="toggleDropdown"
          :highlight-item-up="highlightItemUp"
          :highlight-item-down="highlightItemDown"
          :select-highlighted-item="selectHighlightedItem"
        ></slot>
      </div>
    </template>
    <template #content>
      <div
        class="bg-white dark:bg-gray-850 dark:text-white rounded w-full min-w-40 overflow-hidden"
      >
        <div
          class="p-1 max-h-64 overflow-auto custom-scroll custom-scroll-thumb2 text-sm"
        >
          <div
            v-if="isLoading"
            class="p-2 text-gray-600 dark:text-gray-400 italic"
          >
            {{ t`Loading...` }}
          </div>
          <div
            v-else-if="dropdownItems.length === 0"
            class="p-2 text-gray-600 dark:text-gray-400 italic"
          >
            {{ getEmptyMessage() }}
          </div>
          <template v-else>
            <div
              v-for="(d, index) in dropdownItems"
              :key="`key-${index}`"
              ref="itemsRef"
            >
              <div
                v-if="d.isGroup"
                class="px-2 pt-3 pb-1 text-xs uppercase text-gray-700 dark:text-gray-400 font-semibold tracking-wider"
              >
                {{ d.label }}
              </div>
              <a
                v-else
                class="block p-2 rounded-md mt-1 first:mt-0 cursor-pointer truncate"
                :class="
                  index === highlightedIndex
                    ? 'bg-gray-100 dark:bg-gray-875'
                    : ''
                "
                @mouseenter="highlightedIndex = index"
                @mousedown.prevent
                @click="selectItem(d)"
              >
                <component :is="d.component" v-if="d.component" />
                <template v-else>{{ d.label }}</template>
              </a>
            </div>
          </template>
        </div>
      </div>
    </template>
  </Popover>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { DropdownItem } from 'src/utils/types';
import { useApp } from 'src/composables/useApp.js';
import Popover from './Popover.vue';

const { t } = useApp();
const router = useRouter();

const props = withDefaults(
  defineProps<{
    items?: DropdownItem[];
    right?: boolean;
    isLoading?: boolean;
    df?: Field | null;
    doc?: Doc | null;
  }>(),
  {
    items: () => [],
    right: false,
    isLoading: false,
    df: null,
    doc: null,
  }
);

const isShown = ref(false);
const highlightedIndex = ref(-1);
const itemsRef = ref<Element[]>([]);

const dropdownItems = computed<DropdownItem[]>(() => {
  const groupedItems = getGroupedItems(props.items ?? []);
  const groupNames = Object.keys(groupedItems).filter(Boolean).sort();

  const items: DropdownItem[] = groupedItems[''] ?? [];
  for (let group of groupNames) {
    items.push({
      label: group,
      isGroup: true,
    });

    const grouped = groupedItems[group] ?? [];
    items.push(...grouped);
  }

  return items;
});

watch(highlightedIndex, () => {
  scrollToHighlighted();
});

watch(dropdownItems, () => {
  const maxed = Math.max(highlightedIndex.value, -1);
  highlightedIndex.value = Math.min(maxed, dropdownItems.value.length - 1);
});

function getEmptyMessage(): string {
  const { schemaName, fieldname } = props.df ?? {};
  if (!schemaName || !fieldname || !props.doc) {
    return t`Empty`;
  }

  const emptyMessage = fyo.models[schemaName]?.emptyMessages[fieldname]?.(
    props.doc
  );

  if (!emptyMessage) {
    return t`Empty`;
  }

  return emptyMessage;
}

async function selectItem(d?: DropdownItem): Promise<void> {
  if (!d || !d?.action) {
    return;
  }

  if (props.doc) {
    await d.action(props.doc, router);
  } else {
    await d.action();
  }

  toggleDropdown(false);
}

function toggleDropdown(flag?: boolean): void {
  if (typeof flag !== 'boolean') {
    flag = !isShown.value;
  }

  isShown.value = flag;
}

async function selectHighlightedItem(): Promise<void> {
  let item = dropdownItems.value[highlightedIndex.value];
  if (!item) {
    if (dropdownItems.value.length === 1) {
      item = dropdownItems.value[0];
    } else {
      return;
    }
  }

  if (item.isGroup) {
    return;
  }

  return await selectItem(item);
}

function highlightItemUp(e?: Event): void {
  e?.preventDefault();
  highlightedIndex.value = Math.max(0, highlightedIndex.value - 1);
}

function highlightItemDown(e?: Event): void {
  e?.preventDefault();
  highlightedIndex.value = Math.min(
    dropdownItems.value.length - 1,
    highlightedIndex.value + 1
  );
}

function scrollToHighlighted(): void {
  const elems = itemsRef.value;
  if (!Array.isArray(elems)) {
    return;
  }

  const highlightedElement = elems[highlightedIndex.value];
  if (!(highlightedElement instanceof Element)) {
    return;
  }

  highlightedElement.scrollIntoView({ block: 'nearest' });
}

function getGroupedItems(
  items: DropdownItem[]
): Record<string, DropdownItem[]> {
  const groupedItems: Record<string, DropdownItem[]> = {};
  for (let item of items) {
    const group = item.group ?? '';

    groupedItems[group] ??= [];
    groupedItems[group].push(item);
  }

  return groupedItems;
}
</script>
