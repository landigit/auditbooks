<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  PopoverRoot,
  type PopoverRootEmits,
  type PopoverRootProps,
  useForwardPropsEmits,
} from 'reka-ui';

const props = withDefaults(
  defineProps<PopoverRootProps & { open?: boolean }>(),
  {
    modal: false,
  }
);
const emits = defineEmits<PopoverRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);

const isOpen = ref(props.open ?? false);
watch(
  () => props.open,
  (val) => {
    if (val !== undefined) isOpen.value = val;
  }
);

const handleUpdateOpen = (val: boolean) => {
  isOpen.value = val;
  emits('update:open', val);
};
</script>

<template>
  <div v-bind="$attrs">
    <PopoverRoot
      v-bind="forwarded"
      :open="isOpen"
      @update:open="handleUpdateOpen"
    >
      <slot />
    </PopoverRoot>
  </div>
</template>
