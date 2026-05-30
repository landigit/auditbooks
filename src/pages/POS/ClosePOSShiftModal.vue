<template>
  <Modal :open-modal="openModal" class="w-11/12 max-w-4xl p-6">
    <h1 class="text-xl font-semibold text-center text-main pb-4">
      {{ t`Close POS Shift` }}
    </h1>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-6">
        <h2 class="text-lg font-medium text-main mb-2">
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
      </div>

      <div class="col-span-6">
        <h2 class="text-lg text-main font-medium mb-2">Closing Amounts</h2>
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

        <div class="mt-6 grid grid-cols-2 gap-4 items-end">
          <Button
            class="w-full py-5 bg-indicator-red-bg"
            @click="emit('toggleModal', 'ShiftClose', false)"
          >
            <slot>
              <p
                class="uppercase text-lg text-indicator-red-text font-semibold"
              >
                {{ t`Cancel` }}
              </p>
            </slot>
          </Button>

          <Button
            class="w-full py-5 bg-indicator-green-bg"
            @click="handleSubmit"
          >
            <slot>
              <p
                class="uppercase text-lg text-indicator-green-text font-semibold"
              >
                {{ t`Submit` }}
              </p>
            </slot>
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onActivated, onUpdated, provide } from 'vue';
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

declare const ipc: any;

// Define Props
const props = withDefaults(
  defineProps<{
    openModal?: boolean;
  }>(),
  {
    openModal: false,
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', modal: string, value?: boolean): void;
}>();

// Reactive State
const isValuesSeeded = ref(false);
const posOpeningShiftDoc = ref<POSOpeningShift | undefined>(undefined);
const posClosingShiftDoc = ref<POSClosingShift | undefined>(undefined);
const transactedAmount = ref<Record<string, Money>>({});

// Provide context to child elements
provide(
  'doc',
  computed(() => posClosingShiftDoc.value)
);

// Computed Properties
const isOnline = computed(() => {
  return !!navigator.onLine;
});

// Methods
const setTransactedAmount = async () => {
  posOpeningShiftDoc.value = await getPOSOpeningShiftDoc(fyo);

  const fromDate = posOpeningShiftDoc.value?.openingDate as Date;
  if (!fromDate) {
    return;
  }

  transactedAmount.value =
    (await fyo.db.getPOSTransactedAmount(fromDate, new Date())) ?? {};
};

const seedClosingCash = () => {
  if (!posClosingShiftDoc.value) {
    return;
  }

  posClosingShiftDoc.value.closingCash = [];

  posOpeningShiftDoc.value?.openingCash?.map(async (row) => {
    await posClosingShiftDoc.value?.append('closingCash', {
      count: row.count,
      denomination: row.denomination as Money,
    });
  });
};

const setClosingCashAmount = () => {
  if (!posClosingShiftDoc.value?.closingAmounts) {
    return;
  }

  posClosingShiftDoc.value.closingAmounts.map((row) => {
    if (row.paymentMethod === 'Cash') {
      row.closingAmount = posClosingShiftDoc.value?.closingCashAmount;
      if (row.closingAmount) {
        row.differenceAmount = row.closingAmount.sub(
          row.expectedAmount as Money
        );
      }
    }
  });
};

const seedClosingAmounts = async () => {
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
};

const seedValues = async () => {
  isValuesSeeded.value = false;
  seedClosingCash();
  await seedClosingAmounts();
  isValuesSeeded.value = true;
};

const getField = (fieldname: string) => {
  return fyo.getField(ModelNameEnum.POSClosingShift, fieldname);
};

const handleSubmit = async () => {
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
    ipc.reloadWindow();
  } catch (error) {
    return showToast({
      type: 'error',
      message: t`${error as string}`,
      duration: 'short',
    });
  }
};

// Watchers
watch(
  () => props.openModal,
  async () => {
    await setTransactedAmount();
    await seedClosingAmounts();
  }
);

// Lifecycles
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
