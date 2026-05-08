<script setup lang="ts">
import { ref, onMounted, nextTick, computed, type PropType } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'src/components/ui';
import Button from './Button.vue';
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

const config = computed(() => getIconConfig(props.type));

const details = computed(() => {
  if (!props.detail) return [];
  return Array.isArray(props.detail) ? props.detail : [props.detail];
});

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
  <Dialog v-model:open="open">
    <DialogContent class="w-dialog p-0 overflow-hidden sm:max-w-none">
      <DialogHeader class="p-4 border-b border-border bg-surface">
        <div class="flex items-center justify-center relative">
          <DialogTitle class="text-base font-semibold">{{ title }}</DialogTitle>
          <LucideIcon
            :name="config.iconName"
            class="w-5 h-5 absolute right-0"
            :class="config.iconColor"
          />
        </div>
      </DialogHeader>

      <div class="p-6 bg-surface">
        <DialogDescription v-if="details.length" class="text-center text-main">
          <div v-for="(d, i) in details" :key="i" class="mb-1 last:mb-0">
            {{ d }}
          </div>
        </DialogDescription>
      </div>

      <DialogFooter class="p-4 bg-canvas-muted flex justify-center gap-4">
        <DialogClose
          v-for="(b, index) in buttons"
          :key="b.label"
          as-child
        >
          <Button
            :type="b.isPrimary ? 'primary' : 'secondary'"
            class="w-full"
            @click="handleClick(index)"
          >
            {{ b.label }}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
