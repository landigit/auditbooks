<template>
  <Dropdown
    v-if="actions && actions.length"
    class="text-xs"
    :items="items"
    :doc="doc"
    right
  >
    <template #default="{ toggleDropdown }">
      <Button :type="type" :icon="icon" @tap="toggleDropdown()">
        <slot>
          <lucide-icon name="more-horizontal" class="w-4 h-4" />
        </slot>
      </Button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { Doc } from "fyo/model/doc";
import { Action } from "fyo/model/types";
import Button from "src/components/Button.vue";
import Dropdown from "src/components/Dropdown.vue";
import { DropdownItem } from "src/utils/types";

// Define Props
const props = withDefaults(
  defineProps<{
    actions?: Action[];
    type?: string;
    icon?: boolean;
  }>(),
  {
    actions: () => [],
    type: "secondary",
    icon: true,
  },
);

// Inject Doc
const injectedDoc = inject<Doc | undefined>("doc", undefined);

// Computed Properties
const doc = computed(() => {
  if (injectedDoc instanceof Doc) {
    return injectedDoc;
  }
  return undefined;
});

const items = computed<DropdownItem[]>(() => {
  return props.actions.map(({ label, group, component, action }) => ({
    label,
    group,
    action,
    component,
  }));
});
</script>
