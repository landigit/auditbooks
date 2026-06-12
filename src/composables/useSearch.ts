import { ref, computed, inject, nextTick } from 'vue';
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

const COMPONENT_NAME = 'SearchBar';

type SchemaFilters = { value: string; label: string; index: number }[];

export function useSearch(inputRef: any) {
  const searcher = inject(searcherKey);
  const shortcuts = inject(shortcutsKey);

  const idx = ref(0);
  const openModal = ref(false);
  const inputValue = ref('');
  const showMore = ref(false);
  const limit = ref(50);
  const allowedLimits = [50, 100, 500, -1];

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

  const groupColorMap: Record<SearchGroup, string> = {
    Docs: 'blue',
    Create: 'green',
    List: 'teal',
    Report: 'yellow',
    Page: 'orange',
    Recent: 'purple',
  };

  const groupColorClassMap = computed<Record<SearchGroup, string>>(() => {
    return searchGroups.reduce((map, g) => {
      map[g] = getBgTextColorClass(groupColorMap[g]);
      return map;
    }, {} as Record<SearchGroup, string>);
  });

  const suggestions = computed<SearchItems>(() => {
    if (!searcher?.value) {
      return [];
    }

    const res = searcher.value.search(inputValue.value);
    if (limit.value === -1) {
      return res;
    }

    return res.slice(0, limit.value);
  });

  async function openDocs() {
    const { open } = await import('@tauri-apps/plugin-opener');
    await open('https://docs.frappe.io/' + docsPathMap.Search).catch(console.error);
  }

  function getShortcuts() {
    const ifOpen = (cb: Function) => () => openModal.value && cb();
    const ifClose = (cb: Function) => () => !openModal.value && cb();

    const list = [
      {
        shortcut: 'KeyK',
        callback: ifClose(() => openSearch()),
      },
    ];

    for (const i in searchGroups) {
      list.push({
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

    return list;
  }

  function setShortcuts() {
    for (const { shortcut, callback } of getShortcuts()) {
      shortcuts!.pmod.set(COMPONENT_NAME, [shortcut], callback);
    }
  }

  function openSearch(): void {
    openModal.value = true;
    searcher?.value?.updateKeywords();

    nextTick(() => {
      inputRef.value?.focus();
    });
  }

  function closeSearch(): void {
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

    closeSearch();
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
    const color = groupColorMap[g];
    if (isOn) {
      return `${getBgTextColorClass(
        color
      )} border-${color}-100 dark:border-${color}-800`;
    }

    return `text-${color}-600 dark:text-${color}-400 border-${color}-100 dark:border-${color}-800`;
  }

  return {
    searcher: computed(() => searcher?.value),
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
    reset,
    up,
    down,
    select,
    getGroupFilterButtonClass,
    setShortcuts
  };
}
