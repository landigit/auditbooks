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
        class="bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 shadow-xl dark:text-white rounded-lg w-full min-w-48 max-w-sm overflow-hidden z-50 animate-in fade-in zoom-in-95"
      >
        <div
          class="p-2 max-h-72 overflow-auto custom-scroll custom-scroll-thumb2 text-sm flex flex-col gap-1"
        >
          <div
            v-if="isLoading"
            class="p-4 text-muted-foreground italic text-center text-xs"
          >
            {{ t`Loading...` }}
          </div>
          <div
            v-else-if="dropdownItems.length === 0"
            class="p-4 text-muted-foreground italic text-center text-xs"
          >
            {{ getEmptyMessage() }}
          </div>
          <template v-else>
            <div
              v-for="(d, index) in dropdownItems"
              :key="`key-${index}`"
              ref="items"
              class="flex flex-col"
            >
              <div
                v-if="d.isGroup"
                class="px-3 pt-4 pb-2 text-[10px] normal-case font-semibold tracking-normal text-primary/70"
              >
                {{ d.label }}
              </div>
              <a
                v-else
                class="flex items-center gap-2 p-2.5 rounded-md cursor-pointer truncate transition-all font-semibold select-none bg-transparent hover:bg-white/10 active:scale-[0.98]"
                :class="
                  index === highlightedIndex
                    ? 'bg-white/10 text-foreground'
                    : 'text-foreground/80 hover:text-foreground'
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
<script lang="ts">
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { DropdownItem } from 'src/utils/types';
import { defineComponent, PropType } from 'vue';
import Popover from './Popover.vue';

export default defineComponent({
  name: 'Dropdown',
  components: {
    Popover,
  },
  props: {
    items: {
      type: Array as PropType<DropdownItem[]>,
      default: () => [],
    },
    right: {
      type: Boolean,
      default: false,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    df: {
      type: Object as PropType<Field | null>,
      default: null,
    },
    doc: {
      type: Object as PropType<Doc | null>,
      default: null,
    },
  },
  data() {
    return {
      isShown: false,
      highlightedIndex: -1,
    };
  },
  computed: {
    dropdownItems(): DropdownItem[] {
      const groupedItems = getGroupedItems(this.items ?? []);
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
    },
  },
  watch: {
    highlightedIndex() {
      this.scrollToHighlighted();
    },
    dropdownItems() {
      const maxed = Math.max(this.highlightedIndex, -1);
      this.highlightedIndex = Math.min(maxed, this.dropdownItems.length - 1);
    },
  },
  methods: {
    getEmptyMessage(): string {
      const { schemaName, fieldname } = this.df ?? {};
      if (!schemaName || !fieldname || !this.doc) {
        return this.t`Empty`;
      }

      const emptyMessage = fyo.models[schemaName]?.emptyMessages[fieldname]?.(
        this.doc
      );

      if (!emptyMessage) {
        return this.t`Empty`;
      }

      return emptyMessage;
    },
    async selectItem(d?: DropdownItem): Promise<void> {
      if (!d || !d?.action) {
        return;
      }

      if (this.doc) {
        await d.action(this.doc, this.$router);
      } else {
        await d.action();
      }

      this.toggleDropdown(false);
    },
    toggleDropdown(flag?: boolean): void {
      if (typeof flag !== 'boolean') {
        flag = !this.isShown;
      }

      this.isShown = flag;
    },
    async selectHighlightedItem(): Promise<void> {
      let item = this.dropdownItems[this.highlightedIndex];
      if (!item) {
        if (this.dropdownItems.length === 1) {
          item = this.dropdownItems[0];
        } else {
          return;
        }
      }

      if (item.isGroup) {
        return;
      }

      return await this.selectItem(item);
    },
    highlightItemUp(e?: Event): void {
      e?.preventDefault();

      this.highlightedIndex = Math.max(0, this.highlightedIndex - 1);
    },
    highlightItemDown(e?: Event): void {
      e?.preventDefault();

      this.highlightedIndex = Math.min(
        this.dropdownItems.length - 1,
        this.highlightedIndex + 1
      );
    },
    scrollToHighlighted(): void {
      const elems = this.$refs.items;
      if (!Array.isArray(elems)) {
        return;
      }

      const highlightedElement = elems[this.highlightedIndex];
      if (!(highlightedElement instanceof Element)) {
        return;
      }

      highlightedElement.scrollIntoView({ block: 'nearest' });
    },
  },
});

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
