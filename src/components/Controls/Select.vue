<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <Popover
      :open="dropdownVisible"
      @update:open="(val) => (dropdownVisible = val)"
    >
      <PopoverAnchor as-child>
        <div
          class="relative flex items-center justify-between"
          :class="[
            inputClasses,
            containerClasses,
            dropdownVisible ? 'hover:bg-surface-hover' : '',
          ]"
          @click="toggleDropdown"
        >
          <div
            class="flex items-center justify-between bg-transparent w-full cursor-pointer custom-scroll custom-scroll-thumb2"
            :class="{
              'pointer-events-none': isReadOnly,
              'text-description': !value,
            }"
          >
            <span
              v-if="selectValue || value"
              class="cursor-text text-main w-full"
              >{{ selectValue ? selectValue : value }}</span
            >
            <span v-else>{{ inputPlaceholder }}</span>
            <LucideIcon
              v-if="!isReadOnly"
              name="chevrons-up-down"
              :size="12"
              class="me-[-3px]"
              :class="showMandatory ? 'text-error' : 'text-description'"
            />
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        class="bg-surface text-main rounded w-[var(--reka-popover-trigger-width)] min-w-40 overflow-hidden p-0 border border-border shadow-lg"
      >
        <ul
          class="max-h-40 p-1 overflow-auto custom-scroll custom-scroll-thumb1 text-sm"
        >
          <li
            v-for="option in options"
            :key="option.value"
            class="p-1.5 rounded-md hover:bg-surface-hover flex cursor-pointer"
            :class="selectValue !== option.label ? 'pl-6' : 'pl-2'"
            @click="selectOption(option)"
          >
            <LucideIcon
              v-if="selectValue === option.label"
              name="check"
              :size="16"
              class="mr-1"
            />
            {{ option.label }}
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script lang="ts">
import Base from './Base.vue';

import { defineComponent } from 'vue';
import { SelectOption } from 'schemas/types';
import { Popover, PopoverAnchor, PopoverContent } from 'src/components/Ui';
import LucideIcon from '../LucideIcon.vue';

export default defineComponent({
  name: 'Select',
  components: {
    Popover,
    PopoverAnchor,
    PopoverContent,
    LucideIcon,
  },
  extends: Base,
  emits: ['focus'],
  data() {
    return {
      dropdownVisible: false,
      selectValue: this.value,
    };
  },
  props: {
    closeDropDown: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    options(): SelectOption[] {
      if (this.df.fieldtype !== 'Select') {
        return [];
      }

      return this.df.options;
    },
  },
  methods: {
    toggleDropdown() {
      if (!this.closeDropDown) {
        this.dropdownVisible = true;
      } else if (!this.isReadOnly) {
        this.dropdownVisible = !this.dropdownVisible;
      }
    },
    selectOption(option: SelectOption) {
      this.selectValue = option.label;
      this.triggerChange(option.value);

      if (this.closeDropDown) {
        this.dropdownVisible = !this.dropdownVisible;
      }
    },
  },
});
</script>
