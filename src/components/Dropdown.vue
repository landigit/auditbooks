<template>
  <Popover
    :open="isShown"
    @update:open="
      (val) => {
        isShown = val;
        emit('update:open', val);
      }
    "
  >
    <PopoverAnchor as-child>
      <div class="h-full w-full">
        <slot
          :toggle-dropdown="toggleDropdown"
          :highlight-item-up="highlightItemUp"
          :highlight-item-down="highlightItemDown"
          :select-highlighted-item="selectHighlightedItem"
        ></slot>
      </div>
    </PopoverAnchor>
    <PopoverContent
      :side="right ? 'bottom' : 'bottom'"
      :align="right ? 'end' : 'start'"
      class="bg-surface text-main rounded w-[var(--reka-popover-trigger-width)] min-w-40 overflow-hidden p-0 border border-border shadow-lg"
    >
      <div class="bg-surface text-main rounded w-full min-w-40 overflow-hidden">
        <div
          class="p-1 max-h-64 overflow-auto custom-scroll custom-scroll-thumb2 text-sm"
        >
          <div v-if="isLoading" class="p-2 text-description italic">
            {{ t`Loading...` }}
          </div>
          <div
            v-else-if="dropdownItems.length === 0"
            class="p-2 text-description italic"
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
                class="px-2 pt-3 pb-1 text-xs uppercase text-muted font-semibold tracking-wider"
              >
                {{ d.label }}
              </div>
              <a
                v-else
                class="block p-2 rounded-md mt-1 first:mt-0 cursor-pointer truncate"
                :class="index === highlightedIndex ? 'bg-surface-hover' : ''"
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
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { DropdownItem } from 'src/utils/types';
import { Popover, PopoverAnchor, PopoverContent } from 'src/components/Ui';

// --- Props & Emits ---
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

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

// --- State ---
const router = useRouter();
const itemsRef = ref<Element[]>([]);
const isShown = ref(false);
const highlightedIndex = ref(-1);

// --- Computed ---
const dropdownItems = computed<DropdownItem[]>(() => {
  const groupedItems = getGroupedItems(props.items ?? []);
  const groupNames = Object.keys(groupedItems).filter(Boolean).sort();

  const flatItems: DropdownItem[] = groupedItems[''] ?? [];
  for (let group of groupNames) {
    flatItems.push({
      label: group,
      isGroup: true,
    });

    const grouped = groupedItems[group] ?? [];
    flatItems.push(...grouped);
  }

  return flatItems;
});

// --- Watchers ---
watch(highlightedIndex, () => {
  scrollToHighlighted();
});

watch(dropdownItems, () => {
  const maxed = Math.max(highlightedIndex.value, -1);
  highlightedIndex.value = Math.min(maxed, dropdownItems.value.length - 1);
});

// --- Expose ---
defineExpose({ toggleDropdown });

// --- Methods ---
function getEmptyMessage(): string {
  const { schemaName, fieldname } = props.df ?? {};
  if (!schemaName || !fieldname || !props.doc) {
    return t`Empty`;
  }

  const emptyMessage = fyo.models[schemaName]?.emptyMessages?.[fieldname]?.(
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
  itemsList: DropdownItem[]
): Record<string, DropdownItem[]> {
  const groupedItems: Record<string, DropdownItem[]> = {};
  for (let item of itemsList) {
    const group = item.group ?? '';

    groupedItems[group] ??= [];
    groupedItems[group].push(item);
  }

  return groupedItems;
}
</script>
