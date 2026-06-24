<template>
  <Modal :open-modal="openModal" class="w-3/6 p-4">
    <h1 class="text-xl font-semibold text-center dark:text-gray-100 pb-4">
      {{ t`Close POS Shift` }}
    </h1>

    <h2 class="mt-4 mb-2 text-lg font-medium dark:text-gray-100">
      {{ t`Closing Cash` }}
    </h2>
    <Table
      v-if="isValuesSeeded"
      class="text-base"
      :df="getField('closingCash')"
      :show-header="true"
      :border="true"
      :value="posClosingShiftDoc?.closingCash ?? []"
      :read-only="false"
      @row-change="setClosingCashAmount"
    />

    <h2 class="mt-6 mb-2 text-lg dark:text-gray-100 font-medium">
      Closing Amounts
    </h2>
    <Table
      v-if="isValuesSeeded"
      class="text-base"
      :df="getField('closingAmounts')"
      :show-header="true"
      :border="true"
      :value="posClosingShiftDoc?.closingAmounts"
      :read-only="true"
      @row-change="setClosingCashAmount"
    />

    <div class="mt-4 grid grid-cols-2 gap-4 items-end">
      <Button
        class="w-full py-5"
        type="secondary"
        @click="$emit('toggleModal', 'ShiftClose', false)"
      >
        <span class="uppercase text-lg font-semibold">
          {{ t`Cancel` }}
        </span>
      </Button>

      <Button class="w-full py-5" type="primary" @click="handleSubmit">
        <span class="uppercase text-lg font-semibold">
          {{ t`Submit` }}
        </span>
      </Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide, onActivated, onUpdated } from 'vue';
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import Table from 'src/components/Controls/Table.vue';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { OpeningAmounts } from 'models/inventory/Point of Sale/OpeningAmounts';
import { POSOpeningShift } from 'models/inventory/Point of Sale/POSOpeningShift';
import { fyo } from 'src/initFyo';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';
import {
  validateClosingAmounts,
  transferPOSCashAndWriteOff,
  getPOSOpeningShiftDoc,
} from 'src/utils/pos';
import { POSClosingShift } from 'models/inventory/Point of Sale/POSClosingShift';
import { ForbiddenError } from 'fyo/utils/errors';

const props = withDefaults(
  defineProps<{
    openModal?: boolean;
  }>(),
  {
    openModal: false,
  }
);

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string, value?: boolean): void;
}>();

const isValuesSeeded = ref(false);
const posOpeningShiftDoc = ref<POSOpeningShift | undefined>(undefined);
const posClosingShiftDoc = ref<POSClosingShift | undefined>(undefined);
const transactedAmount = ref<Record<string, Money> | undefined>(undefined);

provide(
  'doc',
  computed(() => posClosingShiftDoc.value)
);

const isOnline = computed(() => !!navigator.onLine);

async function setTransactedAmount() {
  posOpeningShiftDoc.value = await getPOSOpeningShiftDoc(fyo);

  const fromDate = posOpeningShiftDoc.value?.openingDate as Date;
  if (!fromDate) {
    return;
  }

  transactedAmount.value = await fyo.db.getPOSTransactedAmount(
    fromDate,
    new Date()
  );
}

function seedClosingCash() {
  if (!posClosingShiftDoc.value) {
    return;
  }

  posClosingShiftDoc.value.closingCash = [];

  posOpeningShiftDoc.value?.openingCash?.forEach(async (row) => {
    await posClosingShiftDoc.value?.append('closingCash', {
      count: row.count,
      denomination: row.denomination as Money,
    });
  });
}

function setClosingCashAmount() {
  if (!posClosingShiftDoc.value?.closingAmounts) {
    return;
  }

  posClosingShiftDoc.value.closingAmounts.forEach((row) => {
    if (row.paymentMethod === 'Cash') {
      row.closingAmount = posClosingShiftDoc.value?.closingCashAmount as Money;
      row.differenceAmount = row.closingAmount.sub(row.expectedAmount as Money);
    }
  });
}

async function seedClosingAmounts() {
  if (!posClosingShiftDoc.value || !posOpeningShiftDoc.value) {
    return;
  }

  posClosingShiftDoc.value.closingAmounts = [];

  const openingAmounts = posOpeningShiftDoc.value
    ?.openingAmounts as OpeningAmounts[];

  for (const row of openingAmounts) {
    if (!row.paymentMethod) {
      return;
    }

    let expectedAmount = row.amount ?? fyo.pesa(0);

    if (transactedAmount.value) {
      expectedAmount = expectedAmount.add(
        transactedAmount.value[row.paymentMethod]
      );
    }

    await posClosingShiftDoc.value.append('closingAmounts', {
      paymentMethod: row.paymentMethod,
      openingAmount: row.amount,
      closingAmount: fyo.pesa(0),
      expectedAmount: expectedAmount,
      differenceAmount: fyo.pesa(0),
    });
  }
}

async function seedValues() {
  isValuesSeeded.value = false;
  seedClosingCash();
  await seedClosingAmounts();
  isValuesSeeded.value = true;
}

function getField(fieldname: string) {
  return fyo.getField(ModelNameEnum.POSClosingShift, fieldname);
}

async function handleSubmit() {
  try {
    if (!isOnline.value) {
      throw new ForbiddenError(
        t`Device is offline. Please connect to a network to continue.`
      );
    }

    validateClosingAmounts(posClosingShiftDoc.value as POSClosingShift);
    await posClosingShiftDoc.value?.set('closingDate', new Date());
    await posClosingShiftDoc.value?.set(
      'openingShift',
      posOpeningShiftDoc.value?.name
    );
    await posClosingShiftDoc.value?.sync();
    await transferPOSCashAndWriteOff(
      fyo,
      posClosingShiftDoc.value as POSClosingShift
    );

    await fyo.singles.POSSettings?.setAndSync('isShiftOpen', false);
    emit('toggleModal', 'ShiftClose');
    window.location.href = window.location.origin + '/index.html';
  } catch (error) {
    return showToast({
      type: 'error',
      message: t`${error as string}`,
      duration: 'short',
    });
  }
}

watch(
  () => props.openModal,
  async () => {
    await setTransactedAmount();
    await seedClosingAmounts();
  }
);

onActivated(async () => {
  posClosingShiftDoc.value = fyo.doc.getNewDoc(
    ModelNameEnum.POSClosingShift
  ) as POSClosingShift;
  await seedValues();
  await setTransactedAmount();
});

onUpdated(async () => {
  posOpeningShiftDoc.value = await getPOSOpeningShiftDoc(fyo);
  await seedValues();
});
</script>
