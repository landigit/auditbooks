<script setup lang="ts">
import { ref, onMounted, nextTick, computed, type PropType } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
} from 'src/components/ui';
import LucideIcon from './LucideIcon.vue';
import { getIconConfig } from 'src/utils/interactive';
import type { DialogButton, ToastType } from 'src/utils/types';

const props = defineProps({
  type: { type: String as PropType<ToastType>, default: 'info' },
  title: { type: String, required: true },
  detail: {
    type: [String, Array] as PropType<string | string[]>,
    required: false,
  },
  buttons: {
    type: Array as PropType<DialogButton[]>,
    required: true,
  },
});

const open = ref(false);
const primaryButtonRef = ref<any>(null);
const secondaryButtonRef = ref<any>(null);

const config = computed(() => getIconConfig(props.type));

const details = computed(() => {
  if (!props.detail) return [];
  return Array.isArray(props.detail) ? props.detail : [props.detail];
});

const focusButton = () => {
  // Reka UI handles focus management automatically, but we can still force it if needed
  // or let the default focus-trap behavior work.
};

const handleUpdateOpen = (val: boolean) => {
  open.value = val;
  // If closed via backdrop or escape, we might want to trigger a default action
  // but showDialog handles resolution via button clicks.
};

const handleClick = (index: number) => {
  const button = props.buttons[index];
  button.action();
  open.value = false;
};

onMounted(async () => {
  await nextTick();
  open.value = true;
});
</script>

<template>
  <Dialog :open="open" @update:open="handleUpdateOpen">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <div class="flex items-center justify-between mb-2">
          <DialogTitle>{{ title }}</DialogTitle>
          <LucideIcon
            :name="config.iconName"
            class="w-6 h-6"
            :class="config.iconColor"
          />
        </div>
        <DialogDescription v-if="details.length">
          <div v-for="(d, i) in details" :key="i" class="mb-1 last:mb-0">
            {{ d }}
          </div>
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="mt-6">
        <Button
          v-for="(b, index) in buttons"
          :key="b.label"
          :variant="b.isPrimary ? 'default' : 'outline'"
          class="min-w-[5rem]"
          @click="handleClick(index)"
        >
          {{ b.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
