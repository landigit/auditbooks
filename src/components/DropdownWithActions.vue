<template>
  <Dropdown
    v-if="actions && actions.length"
    class="text-xs"
    :items="items"
    :doc="doc"
    right
  >
    <template #default="{ toggleDropdown }">
      <UIButton :variant="type === 'primary' ? 'default' : 'secondary'" :size="icon ? 'icon' : 'default'" @click="toggleDropdown()" class="w-10 h-10 rounded-md">
        <slot>
          <LucideIcon name="more-horizontal" class="w-4 h-4 text-foreground/70" />
        </slot>
      </UIButton>
    </template>
  </Dropdown>
</template>

<script lang="ts">
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import LucideIcon from 'src/components/LucideIcon.vue';
import Dropdown from 'src/components/Dropdown.vue';
import { DropdownItem } from 'src/utils/types';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  name: 'DropdownWithActions',
  components: {
    Dropdown,
    LucideIcon,
  },
  inject: {
    injectedDoc: {
      from: 'doc',
      default: undefined,
    },
  },
  props: {
    actions: { type: Array as PropType<Action[]>, default: () => [] },
    type: { type: String, default: 'secondary' },
    icon: { type: Boolean, default: true },
  },
  computed: {
    doc() {
      // @ts-ignore
      const doc = this.injectedDoc;
      if (doc instanceof Doc) {
        return doc;
      }

      return undefined;
    },
    items(): DropdownItem[] {
      return this.actions.map(({ label, group, component, action }) => ({
        label,
        group,
        action,
        component,
      }));
    },
  },
});
</script>
