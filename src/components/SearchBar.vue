<template>
  <div>
    <!-- Search Bar Button -->
    <Button
      class="px-3 py-2 rounded-r-none bg-canvas-muted"
      :padding="false"
      @click="open"
    >
      <LucideIcon name="search" class="w-4 h-4 text-main" />
    </Button>
  </div>

  <!-- Search Modal -->
  <Modal
    :open-modal="openModal"
    :set-close-listener="false"
    @closemodal="close"
  >
    <div class="w-form">
      <!-- Search Input -->
      <div class="p-1">
        <input
          ref="inputRef"
          v-model="inputValue"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t`Type to search...`"
          class="bg-canvas-muted text-2xl focus:outline-none w-full placeholder-description text-main rounded-md p-3"
          @keydown.up="up"
          @keydown.down="down"
          @keydown.enter="() => select()"
          @keydown.esc="close"
        />
      </div>
      <hr class="border-border" />

      <!-- Search List -->
      <div
        :style="`max-height: ${49 * 6 - 1}px`"
        class="overflow-auto custom-scroll custom-scroll-thumb2"
      >
        <div
          v-for="(si, i) in suggestions"
          :key="`${i}-${si.label}`"
          :data-index="`search-suggestion-${i}`"
          class="hover:bg-surface-hover cursor-pointer"
          :class="idx === i ? 'border-main bg-surface-hover border-s-4' : ''"
          @click="select(i)"
        >
          <!-- Search List Item -->
          <div
            class="flex w-full justify-between px-3 items-center"
            style="height: var(--h-row-mid)"
          >
            <div class="flex items-center">
              <p
                :class="idx === i ? 'text-main' : 'text-description'"
                :style="idx === i ? 'margin-left: -4px' : ''"
              >
                {{ si.label }}
              </p>
              <p
                v-if="si.group === 'Docs'"
                class="text-description text-sm ms-3"
              >
                {{ si.more.filter(Boolean).join(', ') }}
              </p>
            </div>
            <p
              class="text-sm text-end justify-self-end"
              :class="`text-indicator-${groupColorMap[si.group]}-text`"
            >
              {{
                si.group === 'Docs' ? si.schemaLabel : groupLabelMap[si.group]
              }}
            </p>
          </div>

          <hr class="border-border" />
        </div>
      </div>

      <!-- Footer -->
      <hr class="border-border" />
      <div class="m-1 flex justify-between flex-col gap-2 text-sm select-none">
        <!-- Group Filters -->
        <div class="flex justify-between">
          <div class="flex gap-1">
            <button
              v-for="g in searchGroups"
              :key="g"
              class="border border-border px-1 py-0.5 rounded-lg"
              :class="getGroupFilterButtonClass(g)"
              @click="searcher!.set(g, !searcher!.filters.groupFilters[g])"
            >
              {{ groupLabelMap[g] }}
            </button>
          </div>
          <button
            class="hover:text-main py-0.5 rounded text-description"
            @click="showMore = !showMore"
          >
            {{ showMore ? t`Less Filters` : t`More Filters` }}
          </button>
        </div>

        <!-- Additional Filters -->
        <div v-if="showMore" class="-mt-1">
          <!-- Group Skip Filters -->
          <div class="flex gap-1 text-main">
            <button
              v-for="s in ['skipTables', 'skipTransactions'] as const"
              :key="s"
              class="border border-border px-1 py-0.5 rounded-lg"
              :class="{ 'bg-surface-hover': searcher?.filters[s] }"
              @click="searcher?.set(s, !searcher?.filters[s])"
            >
              {{
                s === 'skipTables' ? t`Skip Child Tables` : t`Skip Transactions`
              }}
            </button>
          </div>

          <!-- Schema Name Filters -->
          <div class="flex mt-1 gap-1 text-indicator-blue-text flex-wrap">
            <button
              v-for="sf in schemaFilters"
              :key="sf.value"
              class="border px-1 py-0.5 rounded-lg border-indicator-blue-bg whitespace-nowrap"
              :class="{
                'bg-indicator-blue-bg':
                  searcher?.filters.schemaFilters[sf.value],
              }"
              @click="
                searcher?.set(
                  sf.value,
                  !searcher?.filters.schemaFilters[sf.value]
                )
              "
            >
              {{ sf.label }}
            </button>
          </div>
        </div>

        <!-- Keybindings Help -->
        <div
          class="flex text-sm text-description justify-between items-baseline"
        >
          <div class="flex gap-4">
            <p>↑↓ {{ t`Navigate` }}</p>
            <p>↩ {{ t`Select` }}</p>
            <p><span class="tracking-tighter">esc</span> {{ t`Close` }}</p>
            <button class="flex items-center hover:text-main" @click="openDocs">
              <LucideIcon name="help-circle" class="w-4 h-4 me-1" />
              {{ t`Help` }}
            </button>
          </div>

          <p v-if="searcher?.numSearches" class="ms-auto">
            {{ t`${suggestions.length} out of ${searcher.numSearches}` }}
          </p>

          <div
            v-if="(searcher?.numSearches ?? 0) > 50"
            class="border border-border rounded flex justify-self-end ms-2"
          >
            <template
              v-for="c in allowedLimits.filter(
                (c) => c < (searcher?.numSearches ?? 0) || c === -1
              )"
              :key="c + '-count'"
            >
              <button
                class="w-9"
                :class="limit === c ? 'bg-surface-hover rounded' : ''"
                @click="limit = Number(c)"
              >
                {{ c === -1 ? t`All` : c }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
// --- Imports ---
import { fyo } from 'src/initFyo';
import { getBgTextColorClass } from 'src/utils/colors';
import { searcherKey, shortcutsKey } from 'src/utils/injectionKeys';
import { docsPathMap } from 'src/utils/misc';
import {
  SearchGroup,
  SearchItems,
  getGroupLabelMap,
  searchGroups,
} from 'src/utils/search';
import { useAppStore } from 'src/stores/app';
import {
  ref,
  computed,
  inject,
  nextTick,
  onMounted,
  onActivated,
  onDeactivated,
} from 'vue';
import Button from './Button.vue';
import Modal from './Modal.vue';
import { t } from 'fyo';

// --- Types ---
const COMPONENT_NAME = 'SearchBar';
type SchemaFilters = { value: string; label: string; index: number }[];

// --- State ---
const searcher = inject(searcherKey);
const shortcuts = inject(shortcutsKey);
const store = useAppStore();

const inputRef = ref<HTMLInputElement | null>(null);
const idx = ref(0);
const openModal = ref(false);
const inputValue = ref('');
const showMore = ref(false);
const limit = ref(50);
const allowedLimits = [50, 100, 500, -1];

// --- Computed ---
const groupLabelMap = computed<Record<SearchGroup, string>>(() => {
  return getGroupLabelMap();
});

const schemaFilters = computed<SchemaFilters>(() => {
  const searchables = searcher?.value?.searchables ?? {};

  const schemaNames = Object.keys(searchables);
  const filters = schemaNames
    .map((value) => {
      const schema = fyo.schemaMap[value];
      if (!schema) {
        return;
      }

      let index = 1;
      if (schema.isSubmittable) {
        index = 0;
      } else if (schema.isChild) {
        index = 2;
      }

      return { value, label: schema.label, index };
    })
    .filter(Boolean) as SchemaFilters;

  return filters.sort((a, b) => a.index - b.index);
});

const groupColorMap = computed<Record<SearchGroup, string>>(() => {
  return {
    Docs: 'blue',
    Create: 'green',
    List: 'teal',
    Report: 'yellow',
    Page: 'orange',
    Recent: 'purple',
  };
});

// groupColorClassMap removed as it was unused.

const suggestions = computed<SearchItems>(() => {
  if (!searcher?.value) {
    return [];
  }

  const result = searcher.value.search(inputValue.value);
  if (limit.value === -1) {
    return result;
  }

  return result.slice(0, limit.value);
});

// --- Expose ---
defineExpose({ open });

// --- Lifecycle ---
onMounted(() => {
  if (store.isDevelopment) {
    // @ts-ignore
    window.search = { open, close, searcher };
  }

  openModal.value = false;
});

onActivated(() => {
  setShortcuts();
  openModal.value = false;
});

onDeactivated(() => {
  shortcuts?.delete(COMPONENT_NAME);
});

// --- Methods ---
function openDocs() {
  ipc.openLink('https://landigit.com/auditbooks/' + docsPathMap.Search);
}

function getShortcuts() {
  const ifOpen = (cb: Function) => () => openModal.value && cb();
  const ifClose = (cb: Function) => () => !openModal.value && cb();

  const sh = [
    {
      shortcut: 'KeyK',
      callback: ifClose(() => open()),
    },
  ];

  for (const i in searchGroups) {
    sh.push({
      shortcut: `Digit${Number(i) + 1}`,
      callback: ifOpen(() => {
        const group = searchGroups[i];
        if (!searcher?.value) {
          return;
        }

        const value = searcher.value.filters.groupFilters[group];
        if (typeof value !== 'boolean') {
          return;
        }

        searcher.value.set(group, !value);
      }),
    });
  }

  return sh;
}

function setShortcuts() {
  for (const { shortcut, callback } of getShortcuts()) {
    shortcuts!.pmod.set(COMPONENT_NAME, [shortcut], callback);
  }
}

function open(): void {
  openModal.value = true;
  searcher?.value?.updateKeywords();

  nextTick(() => {
    inputRef.value?.focus();
  });
}

function close(): void {
  openModal.value = false;
  reset();
}

function reset(): void {
  inputValue.value = '';
}

function up(): void {
  idx.value = Math.max(idx.value - 1, 0);
  scrollToHighlighted();
}

function down(): void {
  idx.value = Math.max(
    Math.min(idx.value + 1, suggestions.value.length - 1),
    0
  );
  scrollToHighlighted();
}

function select(index?: number): void {
  idx.value = index ?? idx.value;
  const selectedItem = suggestions.value[idx.value];

  if (selectedItem?.action) {
    searcher?.value?.addToRecent(selectedItem);
    selectedItem.action();
  }

  close();
}

function scrollToHighlighted(): void {
  const query = `[data-index="search-suggestion-${idx.value}"]`;
  const element = document.querySelectorAll(query)?.[0];
  element?.scrollIntoView({ block: 'nearest' });
}

function getGroupFilterButtonClass(g: SearchGroup): string {
  if (!searcher?.value) {
    return '';
  }

  const isOn = searcher.value.filters.groupFilters[g];
  const color = groupColorMap.value[g];
  if (isOn) {
    return `${getBgTextColorClass(color)} border-indicator-${color}-bg`;
  }

  return `text-indicator-${color}-text border-indicator-${color}-bg`;
}
</script>

<style scoped>
input[type='search']::-webkit-search-decoration,
input[type='search']::-webkit-search-cancel-button,
input[type='search']::-webkit-search-results-button,
input[type='search']::-webkit-search-results-decoration {
  display: none;
}
</style>
