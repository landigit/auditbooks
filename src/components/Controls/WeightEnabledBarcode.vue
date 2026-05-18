<template>
  <div
    class="px-2 w-36 flex items-center border rounded border-border bg-canvas-muted text-main focus-within:bg-surface-hover"
  >
    <input
      ref="scanner"
      type="text"
      class="text-base placeholder:text-description w-full bg-transparent outline-none"
      :placeholder="t`Enter weight barcode`"
      @change="handleChange"
    />
    <lucide-icon
      name="maximize"
      class="w-3 h-3 text-description cursor-text"
      @click="() => ($refs.scanner as HTMLInputElement).focus()"
    />
  </div>
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
  if (cooldown === cleanBarcode) {
    return;
  }

  cooldown = cleanBarcode;
  setTimeout(() => (cooldown = ''), 100);

  const matchedItems = (await fyo.db.getAll('Item', {
    filters: { barcode: cleanBarcode },
    fields: ['name'],
  })) as { name: string }[];

  const itemName = matchedItems?.[0]?.name;

  if (itemName) {
    success(t`${itemName} quantity 1 added.`);
    emit('item-selected', itemName);
    return;
  }

  const isWeightEnabled = fyo.singles.POSSettings?.weightEnabledBarcode;
  const checkDigits = fyo.singles.POSSettings?.checkDigits as number;
  const checkDigitsStr = checkDigits?.toString() || '';

  const itemCodeDigits = fyo.singles.POSSettings?.itemCodeDigits as number;
  const itemWeightDigits = fyo.singles.POSSettings?.itemWeightDigits as number;

  if (
    cleanBarcode.length !==
    checkDigitsStr.length + itemCodeDigits + itemWeightDigits
  ) {
    return error(t`Barcode ${cleanBarcode} has an invalid length.`);
  }

  if (!cleanBarcode.startsWith(checkDigitsStr)) {
    return error(t`Item with barcode ${cleanBarcode} not found.`);
  }

  const filters: Record<string, string> = {
    itemCode: cleanBarcode.slice(
      checkDigitsStr.length,
      checkDigitsStr.length + itemCodeDigits
    ),
  };

  const fields = ['name', 'unit'];

  const items = (await fyo.db.getAll('Item', { filters, fields })) || [];
  const { name, unit } = items[0] || {};

  if (!name) {
    return error(t`Item with barcode ${cleanBarcode} not found.`);
  }

  const quantity = isWeightEnabled
    ? parseBarcode(
        cleanBarcode,
        unit as string,
        checkDigitsStr.length + itemCodeDigits
      )
    : 1;

  success(t`${name as string} quantity ${quantity} added.`);
  emit('item-selected', name, quantity);
}

function parseBarcode(bc: string, unitType: string, sliceDigit: number) {
  const weightRaw = parseInt(bc.slice(sliceDigit));

  let itemQuantity = 0;

  switch (unitType) {
    case 'Kg':
      itemQuantity = Math.floor(weightRaw / 1000);
      break;
    case 'Gram':
      itemQuantity = weightRaw;
      break;
    case 'Unit':
    case 'Meter':
    case 'Hour':
    case 'Day':
      itemQuantity = weightRaw;
      break;
    default:
      throw new Error('Unknown unit type!');
  }

  return itemQuantity;
}

async function scanListener(e: KeyboardEvent) {
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
