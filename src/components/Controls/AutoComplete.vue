<template>
  <Dropdown
    :items="suggestions"
    :is-loading="isLoading"
    :df="df"
    :doc="doc"
    @update:open="(val) => (isDropdownOpen = val)"
  >
    <template
      #default="{
        toggleDropdown,
        highlightItemUp,
        highlightItemDown,
        selectHighlightedItem,
      }"
    >
      <div v-if="showLabel" :class="labelClasses">
        {{ df.label }}
      </div>
      <div
        class="flex items-center justify-between pe-2 rounded"
        :style="containerStyles"
        :class="containerClasses"
      >
        <input
          ref="inputRef"
          spellcheck="false"
          :class="inputClasses"
          class="bg-transparent"
          type="text"
          :value="linkValue"
          :placeholder="inputPlaceholder"
          :readonly="isReadOnly"
          :tabindex="isReadOnly ? '-1' : '0'"
          @focus="(e) => !isReadOnly && onInputFocus(e)"
          @click="(e) => !isReadOnly && onClick(e, toggleDropdown)"
          @blur="(e) => !isReadOnly && onBlur((e.target as HTMLInputElement).value, toggleDropdown)"
          @input="(e) => onInput(e, toggleDropdown)"
          @keydown.up="onKeyDownUp($event, toggleDropdown, highlightItemUp)"
          @keydown.down="
            onKeyDownDown($event, toggleDropdown, highlightItemDown)
          "
          @keydown.enter="
            onPressEnter($event, toggleDropdown, selectHighlightedItem)
          "
          @keydown.tab="closeDropdown($event, toggleDropdown)"
          @keydown.esc="closeDropdown($event, toggleDropdown)"
        />

        <svg
          v-if="!isReadOnly && !canLink"
          class="w-3 h-3"
          style="background: inherit; margin-right: -3px"
          viewBox="0 0 5 10"
          xmlns="http://www.w3.org/2000/svg"
          @click="(e) => !isReadOnly && onIconFocus(e, toggleDropdown)"
        >
          <path
            d="M1 2.636L2.636 1l1.637 1.636M1 7.364L2.636 9l1.637-1.636"
            class="stroke-current"
            :class="showMandatory ? 'text-error' : 'text-description'"
            fill="none"
            fill-rule="evenodd"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <div v-if="canLink" class="flex items-center gap-1">
          <button
            v-if="value && showClearButton"
            class="p-0.5 rounded bg-transparent text-description hover:text-main transition-colors"
            @click.stop.prevent="clearValue"
            @mousedown.prevent
          >
            <lucide-icon name="x" class="w-3.5 h-3.5" />
          </button>
          <Popover v-if="linkSchemaName && value" :open="showQuickView">
            <PopoverAnchor as-child>
              <button
                class="h-6 w-6 flex items-center justify-center p-0 rounded-md text-description hover:text-main hover:bg-surface-hover transition-colors outline-none"
                @mouseenter="showQuickView = true"
                @mouseleave="showQuickView = false"
                @click.stop.prevent="routeToLinkedDoc"
              >
                <lucide-icon name="chevron-right" class="w-4 h-4" />
              </button>
            </PopoverAnchor>
            <PopoverContent
              v-if="showQuickView"
              side="bottom"
              :side-offset="10"
              class="p-0 overflow-hidden shadow-xl border-border"
            >
              <QuickView :schema-name="linkSchemaName" :name="value as string" />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { getOptionList } from 'fyo/utils';
import { FieldTypeEnum } from 'schemas/types';
import Dropdown from 'src/components/Dropdown.vue';
import { fuzzyMatch } from 'src/utils';
import { getFormRoute, routeTo } from 'src/utils/ui';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from 'src/components/Ui';
import QuickView from '../QuickView.vue';
import { BaseControlProps, useBaseControl } from 'src/composables/useBaseControl';

interface AutoCompleteProps extends BaseControlProps {
  focusInput?: boolean;
  showClearButton?: boolean;
  getSuggestions?: (keyword?: string) => Promise<any[]> | any[];
  linkValueOverride?: string | null;
  customClear?: () => void;
}

const props = withDefaults(defineProps<AutoCompleteProps>(), {
  focusInput: false,
  showClearButton: false,
  step: 1,
  border: false,
  size: 'large',
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
  linkValueOverride: null,
});

const emit = defineEmits<{
  (e: 'focus', ev: FocusEvent): void;
  (e: 'input', ev: Event): void;
  (e: 'change', val: any): void;
  (e: 'update:linkValue', val: string): void;
}>();

const showQuickView = ref(false);
const internalLinkValue = ref('');
const linkValue = computed({
  get: () => props.linkValueOverride !== null ? props.linkValueOverride : internalLinkValue.value,
  set: (val) => {
    internalLinkValue.value = val;
    emit('update:linkValue', val);
  }
});

const focInp = ref(false);
const isLoading = ref(false);
const suggestions = ref<any[]>([]);
const isFocused = ref(false);
const isDropdownOpen = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const {
  doc,
  labelClasses,
  inputClasses,
  containerClasses,
  isReadOnly,
  inputPlaceholder,
  showMandatory,
  triggerChange,
  focus
} = useBaseControl(props, emit, inputRef);

const linkSchemaName = computed(() => {
  let schemaName = (props.df as any)?.target;
  if (!schemaName) {
    const references = (props.df as any)?.references ?? '';
    schemaName = doc.value?.[references];
  }
  return schemaName;
});

const options = computed(() => {
  if (!props.df) {
    return [];
  }
  return getOptionList(props.df, doc.value);
});

const canLink = computed(() => {
  if (!props.value || !props.df) {
    return false;
  }

  const fieldtype = props.df?.fieldtype;
  const isLink = fieldtype === FieldTypeEnum.Link;
  const isDynamicLink = fieldtype === FieldTypeEnum.DynamicLink;

  if (!isLink && !isDynamicLink) {
    return false;
  }

  if (isLink && (props.df as any).target) {
    return true;
  }

  const references = (props.df as any).references;
  if (!references) {
    return false;
  }

  if (!doc.value?.[references]) {
    return false;
  }

  return true;
});

const clearValue = (e?: Event) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (props.customClear) {
    props.customClear();
    return;
  }

  triggerChange('');
  setLinkValue('');
};

const routeToLinkedDoc = async () => {
  const name = props.value as string;
  if (!linkSchemaName.value || !name) {
    return;
  }

  showQuickView.value = false;
  const route = getFormRoute(linkSchemaName.value, name);
  await routeTo(route);
};

const focusInputTag = async () => {
  focInp.value = true;
  if (linkValue.value) {
    return;
  }

  await nextTick();
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

const setLinkValue = (value: any) => {
  linkValue.value = value || '';
};

const getLinkValue = (value: any) => {
  const oldValue = linkValue.value;
  let option = options.value.find((o) => o.value === value);
  if (!option) {
    option = options.value.find((o) => o.label === value);
  }
  if (!value && !option) {
    return null;
  }

  return option?.label ?? oldValue;
};

const getSuggestionsFunc = async (keyword = '') => {
  if (props.getSuggestions) {
    return await props.getSuggestions(keyword);
  }

  const lowerKeyword = keyword.toLowerCase();
  if (!lowerKeyword) {
    return options.value;
  }

  return options.value
    .map((item) => ({ ...fuzzyMatch(lowerKeyword, item.label), item }))
    .filter(({ isMatch }) => isMatch)
    .sort((a, b) => a.distance - b.distance)
    .map(({ item }) => item);
};

const updateSuggestions = async (keyword?: string) => {
  if (typeof keyword === 'string') {
    setLinkValue(keyword);
  }

  isLoading.value = true;
  const suggestionsList = await getSuggestionsFunc(keyword);
  suggestions.value = setSetSuggestionAction(suggestionsList);
  isLoading.value = false;
};

const setSetSuggestionAction = (suggestionsList: any[]) => {
  for (const option of suggestionsList) {
    if (!option.action) {
      option.action = () => setSuggestion(option);
    }
  }
  return suggestionsList;
};

const setSuggestion = (suggestion: any) => {
  if (suggestion?.actionOnly) {
    setLinkValue(props.value);
    return;
  }

  if (suggestion) {
    setLinkValue(suggestion.label);
    triggerChange(suggestion.value);
  }
};

const onInputFocus = (_e: FocusEvent) => {
  isFocused.value = true;
};

const onClick = (e: MouseEvent, toggleDropdown: (val: boolean) => void) => {
  if (isFocused.value) {
    toggleDropdown(true);
    updateSuggestions();
    isDropdownOpen.value = true;
    emit('focus', e as any);
  }
};

const onIconFocus = (e: MouseEvent, toggleDropdown: (val: boolean) => void) => {
  isFocused.value = true;
  toggleDropdown(true);
  updateSuggestions();
  isDropdownOpen.value = true;
  emit('focus', e as any);
};

const onBlur = async (label: string, _toggleDropdown: (val: boolean) => void) => {
  isFocused.value = false;
  isDropdownOpen.value = false;
  if (!label && !props.value) {
    return;
  }
  if (!label) {
    triggerChange('');
    return;
  }

  if (suggestions.value.length === 0) {
    triggerChange(label);
    return;
  }

  const suggestion = suggestions.value.find((s) => s.label === label);
  if (suggestion) {
    setSuggestion(suggestion);
  } else {
    const suggestionsList = await getSuggestionsFunc(label);
    setSuggestion(suggestionsList[0]);
  }
};

const onInput = (e: any, toggleDropdown: (val: boolean) => void) => {
  if (isReadOnly.value) {
    return;
  }

  if (!e.target.value || focInp.value) {
    e.target.value = null;
    focInp.value = false;
    toggleDropdown(false);
    return;
  }

  triggerChange(e.target.value);
  updateSuggestions(e.target.value);
};

const onPressEnter = async (e: any, toggleDropdown: (val: boolean) => void, selectHighlightedItem: () => Promise<void>) => {
  e.preventDefault();

  if (
    suggestions.value.length > 0 &&
    isFocused.value &&
    isDropdownOpen.value
  ) {
    await selectHighlightedItem();
    closeDropdown(e, toggleDropdown);
    return;
  }

  await updateSuggestions(linkValue.value || e.target.value);
  toggleDropdown(true);
  isDropdownOpen.value = true;
};

const onKeyDownUp = (_e: any, toggleDropdown: (val: boolean) => void, highlightItemUp: () => void) => {
  if (suggestions.value.length === 0) {
    updateSuggestions();
    toggleDropdown(true);
    isDropdownOpen.value = true;
  }
  highlightItemUp();
};

const onKeyDownDown = (_e: any, toggleDropdown: (val: boolean) => void, highlightItemDown: () => void) => {
  if (suggestions.value.length === 0) {
    updateSuggestions();
    toggleDropdown(true);
    isDropdownOpen.value = true;
  }
  highlightItemDown();
};

const closeDropdown = (_e: any, toggleDropdown: (val: boolean) => void) => {
  toggleDropdown(false);
  isDropdownOpen.value = false;
};

watch(() => props.value, (newValue) => {
  setLinkValue(getLinkValue(newValue));
}, { immediate: true });

onMounted(() => {
  const value = linkValue.value || props.value;
  setLinkValue(getLinkValue(value));
});

defineExpose({
  showQuickView,
  linkValue,
  suggestions,
  isDropdownOpen,
  inputRef,
  clearValue,
  routeToLinkedDoc,
  focusInputTag,
  setLinkValue,
  getLinkValue,
  updateSuggestions,
  setSuggestion,
  focus,
  isReadOnly,
  containerClasses,
  inputClasses,
  labelClasses,
  inputPlaceholder,
  isFocused,
});
</script>
