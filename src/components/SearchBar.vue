<template>
  <!-- Search Bar Button -->
  <Button
    class="px-3 py-2 rounded-r-none dark:bg-gray-900"
    :padding="false"
    v-bind="$attrs"
    @click="openSearch"
  >
    <feather-icon
      name="search"
      class="w-4 h-4 text-current"
    />
  </Button>

  <!-- Search Modal -->
  <Modal
    :open-modal="openModal"
    :set-close-listener="false"
    @closemodal="closeSearch"
  >
    <div class="w-form">
      <!-- Search Input -->
      <div class="p-1">
        <input
          ref="input"
          v-model="inputValue"
          type="search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t`Type to search...`"
          class="bg-gray-100 dark:bg-gray-800 text-2xl focus:outline-none w-full rounded-md p-3 search-modal-input"
          @keydown.up="up"
          @keydown.down="down"
          @keydown.enter="() => select()"
          @keydown.esc="closeSearch"
        />
      </div>
      <hr v-if="suggestions.length" class="dark:border-gray-800" />

      <!-- Search List -->
      <div
        :style="`max-height: ${49 * 6 - 1}px`"
        class="overflow-auto custom-scroll custom-scroll-thumb2"
      >
        <div
          v-for="(si, i) in suggestions"
          :key="`${i}-${si.label}`"
          :data-index="`search-suggestion-${i}`"
          class="hover:bg-gray-50 dark:hover:bg-gray-875 cursor-pointer"
          :class="
            idx === i
              ? 'border-gray-700 dark:border-gray-200 bg-gray-50 dark:bg-gray-875 border-s-4'
              : ''
          "
          @click="select(i)"
        >
          <!-- Search List Item -->
          <div
            class="flex w-full justify-between px-3 items-center"
            style="height: var(--h-row-mid)"
          >
            <div class="flex items-center">
              <p
                class="search-suggestion-label"
                :class="idx === i ? 'search-suggestion-label-active' : ''"
                :style="idx === i ? 'margin-left: -4px' : ''"
              >
                {{ si.label }}
              </p>
              <p
                v-if="si.group === 'Docs'"
                class="text-sm ms-3 search-suggestion-more"
              >
                {{ si.more.filter(Boolean).join(', ') }}
              </p>
            </div>
            <p
              class="text-sm text-end justify-self-end search-suggestion-tag"
            >
              {{
                si.group === 'Docs' ? si.schemaLabel : groupLabelMap[si.group]
              }}
            </p>
          </div>

          <hr
            v-if="i !== suggestions.length - 1"
            class="dark:border-gray-800"
          />
        </div>
      </div>

      <!-- Footer -->
      <hr class="dark:border-gray-800" />
      <div class="m-1 flex justify-between flex-col gap-2 text-sm select-none">
        <!-- Group Filters -->
        <div class="flex justify-between">
          <div class="flex gap-1">
            <button
              v-for="g in searchGroups"
              :key="g"
              class="border dark:border-gray-800 px-1 py-0.5 rounded-lg"
              :class="getGroupFilterButtonClass(g)"
              @click="searcher?.set(g, !searcher?.filters.groupFilters[g])"
            >
              {{ groupLabelMap[g] }}
            </button>
          </div>
          <button
            class="py-0.5 rounded search-more-filters-btn"
            @click="showMore = !showMore"
          >
            {{ showMore ? t`Less Filters` : t`More Filters` }}
          </button>
        </div>

        <!-- Additional Filters -->
        <div v-if="showMore" class="-mt-1">
          <!-- Group Skip Filters -->
          <div class="flex gap-1 text-gray-800 dark:text-gray-200">
            <button
              v-for="s in ['skipTables', 'skipTransactions'] as const"
              :key="s"
              class="border dark:border-gray-800 px-1 py-0.5 rounded-lg"
              :class="{ 'bg-gray-200': searcher?.filters[s] }"
              @click="searcher?.set(s, !searcher?.filters[s])"
            >
              {{
                s === 'skipTables' ? t`Skip Child Tables` : t`Skip Transactions`
              }}
            </button>
          </div>

          <!-- Schema Name Filters -->
          <div
            class="flex mt-1 gap-1 text-blue-500 dark:text-blue-100 flex-wrap"
          >
            <button
              v-for="sf in schemaFilters"
              :key="sf.value"
              class="border px-1 py-0.5 rounded-lg border-blue-100 dark:border-blue-800 whitespace-nowrap"
              :class="{
                'bg-blue-100 dark:bg-blue-800':
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
        <div class="flex text-sm justify-between items-baseline search-modal-footer">
          <div class="flex gap-4">
            <p>↑↓ {{ t`Navigate` }}</p>
            <p>↩ {{ t`Select` }}</p>
            <p><span class="tracking-tighter">esc</span> {{ t`Close` }}</p>
            <button
              class="flex items-center search-footer-help-btn"
              @click="openDocs"
            >
              <feather-icon name="help-circle" class="w-4 h-4 me-1" />
              {{ t`Help` }}
            </button>
          </div>

          <p v-if="searcher?.numSearches" class="ms-auto search-footer-count">
            {{ t`${suggestions.length} out of ${searcher.numSearches}` }}
          </p>

          <div
            v-if="(searcher?.numSearches ?? 0) > 50"
            class="border border-gray-100 dark:border-gray-875 rounded flex justify-self-end ms-2"
          >
            <template
              v-for="c in allowedLimits.filter(
                (c) => c < (searcher?.numSearches ?? 0) || c === -1
              )"
              :key="c + '-count'"
            >
              <button
                class="w-9"
                :class="
                  limit === c ? 'bg-gray-100 dark:bg-gray-875 rounded' : ''
                "
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
import { ref, onMounted, onActivated, onDeactivated } from 'vue';
import { fyo } from 'src/initFyo';
import { useApp } from 'src/composables/useApp.js';
import Button from './Button.vue';
import Modal from './Modal.vue';
import { useSearch } from '../composables/useSearch.js';

const COMPONENT_NAME = 'SearchBar';

const { t } = useApp();
const input = ref<HTMLInputElement | null>(null);

const {
  searcher,
  shortcuts,
  idx,
  searchGroups,
  openModal,
  inputValue,
  showMore,
  limit,
  allowedLimits,
  groupLabelMap,
  schemaFilters,
  groupColorMap,
  groupColorClassMap,
  suggestions,
  openDocs,
  openSearch,
  closeSearch,
  up,
  down,
  select,
  getGroupFilterButtonClass,
  setShortcuts
} = useSearch(input);

onMounted(() => {
  if (fyo.store.isDevelopment || (window as any).isTestEnv) {
    // @ts-ignore
    window.search = {
      idx,
      searchGroups,
      openModal,
      inputValue,
      showMore,
      limit,
      allowedLimits,
      suggestions,
      openSearch,
      closeSearch,
      select
    };
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
</script>

<style scoped>
input[type='search']::-webkit-search-decoration,
input[type='search']::-webkit-search-cancel-button,
input[type='search']::-webkit-search-results-button,
input[type='search']::-webkit-search-results-decoration {
  display: none;
}
.search-modal-input {
  color: var(--foreground) !important;
}
.search-modal-input::placeholder {
  color: color-mix(in srgb, var(--foreground) 40%, transparent) !important;
}
.search-suggestion-label {
  color: color-mix(in srgb, var(--foreground) 80%, transparent) !important;
  transition: color 0.1s;
}
.search-suggestion-label-active {
  color: var(--foreground) !important;
  font-weight: 500 !important;
}
.search-suggestion-more {
  color: color-mix(in srgb, var(--foreground) 50%, transparent) !important;
}
.search-suggestion-tag {
  color: color-mix(in srgb, var(--foreground) 60%, transparent) !important;
}
.search-more-filters-btn {
  color: color-mix(in srgb, var(--foreground) 70%, transparent) !important;
  transition: color 0.1s;
}
.search-more-filters-btn:hover {
  color: var(--foreground) !important;
}
.search-modal-footer {
  color: color-mix(in srgb, var(--foreground) 75%, transparent) !important;
}
.search-footer-help-btn {
  color: color-mix(in srgb, var(--foreground) 80%, transparent) !important;
  transition: color 0.1s;
}
.search-footer-help-btn:hover {
  color: var(--foreground) !important;
}
.search-footer-count {
  color: color-mix(in srgb, var(--foreground) 70%, transparent) !important;
}
</style>
