<template>
  <view
    class="px-2 w-36 flex items-center border rounded border-border bg-canvas-muted text-main focus-within:bg-surface-hover"
  >
    <input
      ref="scanner"
      type="text"
      class="text-base placeholder:text-description w-full bg-transparent outline-none"
      :placeholder="t`Enter barcode`"
      @change="handleChange"
    />
    <lucide-icon
      name="maximize"
      class="w-3 h-3 text-description cursor-text"
      @tap="() => ($refs.scanner as HTMLInputElement).focus()"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue';
import { showToast } from 'src/utils/interactive';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

const emit = defineEmits(['item-selected']);

const scanner = ref<HTMLInputElement | null>(null);

let timerId: ReturnType<typeof setTimeout> | null = null;
let barcode = '';
let cooldown = '';

function handleChange(e: Event) {
  const elem = e.target as HTMLInputElement;
  selectItem(elem.value);
  elem.value = '';
}

async function selectItem(code: string) {
  const cleanBarcode = code.trim();
  if (!/^[A-Za-z0-9]{12,}$/.test(cleanBarcode)) {
    return error(t`Invalid barcode value ${cleanBarcode}.`);
  }

  /**
   * Between two entries of the same item, this adds
   * a cooldown period of 100ms. This is to prevent
   * double entry.
   */
  if (cooldown === cleanBarcode) {
    return;
  }
  cooldown = cleanBarcode;
  setTimeout(() => (cooldown = ''), 100);

  const items = (await fyo.db.getAll('Item', {
    filters: { barcode: cleanBarcode },
    fields: ['name'],
  })) as { name: string }[];

  const name = items?.[0]?.name;

  if (!name) {
    return error(t`Item with barcode ${cleanBarcode} not found.`);
  }

  success(t`${name} quantity 1 added.`);
  emit('item-selected', name);
}

async function scanListener(e: KeyboardEvent) {
  /**
   * Based under the assumption that
   * - Barcode scanners trigger keydown events
   * - Keydown events are triggered quicker than human can
   *    i.e. at max 20ms between events
   * - Keydown events are triggered for barcode digits
   * - The sequence of digits might be punctuated by a return
   */

  const { key, code } = e;
  const keyCode = Number(key);
  const isEnter = code === 'Enter';

  if (Number.isNaN(keyCode) && !isEnter) {
    return;
  }

  if (isEnter) {
    return await setItemFromBarcode();
  }

  clearTimer();

  barcode += key;
  timerId = setTimeout(async () => {
    await setItemFromBarcode();
    barcode = '';
  }, 20);
}

async function setItemFromBarcode() {
  if (barcode.length < 12) {
    return;
  }

  await selectItem(barcode);

  barcode = '';
  clearTimer();
}

function clearTimer() {
  if (timerId === null) {
    return;
  }

  clearInterval(timerId);
  timerId = null;
}

function error(message: string) {
  showToast({ type: 'error', message });
}

function success(message: string) {
  showToast({ type: 'success', message });
}

onMounted(() => {
  document.addEventListener('keydown', scanListener);
});

onUnmounted(() => {
  document.removeEventListener('keydown', scanListener);
});

onActivated(() => {
  document.addEventListener('keydown', scanListener);
});

onDeactivated(() => {
  document.removeEventListener('keydown', scanListener);
});
</script>
