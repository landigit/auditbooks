<template>
  <Dropdown
    v-if="actions && actions.length"
    class="text-xs"
    :items="items"
    :doc="doc"
    right
  >
    <template #default="{ toggleDropdown }">
      <Button :type="type" :icon="icon" @click="toggleDropdown()">
        <slot>
          <feather-icon name="more-horizontal" class="w-4 h-4" />
        </slot>
      </Button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import Button from 'src/components/Button.vue';
import Dropdown from 'src/components/Dropdown.vue';
import { DropdownItem } from 'src/utils/types';

const props = withDefaults(
  defineProps<{
    actions?: Action[];
    type?: string;
    icon?: boolean;
  }>(),
  {
    actions: () => [],
    type: 'secondary',
    icon: true,
  }
);

const injectedDoc = inject<Doc | undefined>('doc', undefined);

const doc = computed(() => {
  if (injectedDoc instanceof Doc) {
    return injectedDoc;
  }
  return undefined;
});

const items = computed<DropdownItem[]>(() => {
  return props.actions.map(({ label, group, component, action }) => {
    let icon: string | undefined;
    const cleanLabel = label?.toLowerCase() ?? '';
    if (cleanLabel.includes('duplicate')) {
      icon = 'copy';
    } else if (cleanLabel.includes('new entry') || cleanLabel.includes('create')) {
      icon = 'plus-circle';
    } else if (cleanLabel.includes('return')) {
      icon = 'rotate-ccw';
    } else if (cleanLabel.includes('delete')) {
      icon = 'trash-2';
    } else if (cleanLabel.includes('cancel')) {
      icon = 'x-circle';
    } else if (cleanLabel.includes('payment')) {
      icon = 'dollar-sign';
    } else if (cleanLabel.includes('shipment') || cleanLabel.includes('delivery')) {
      icon = 'truck';
    } else if (cleanLabel.includes('receipt')) {
      icon = 'file-text';
    } else if (cleanLabel.includes('ledger') || cleanLabel.includes('entries')) {
      icon = 'book-open';
    } else if (cleanLabel.includes('edit')) {
      icon = 'edit-3';
    }

    return {
      label,
      group,
      action,
      component,
      icon,
    };
  });
});
</script>
