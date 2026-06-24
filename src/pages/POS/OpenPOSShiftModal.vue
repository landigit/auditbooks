<template>
  <Modal class="w-3/6 p-4">
    <h1 class="text-xl font-semibold text-center dark:text-gray-100 pb-4">
      {{ t`Open POS Shift` }}
    </h1>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-6">
        <h2 class="text-lg font-medium dark:text-gray-100">
          {{ t`Cash In Denominations` }}
        </h2>

        <Table
          v-if="isValuesSeeded"
          class="mt-4 text-base"
          :df="getField('openingCash')"
          :show-header="true"
          :border="true"
          :value="posShiftDoc?.openingCash"
          @row-change="handleChange"
        />
      </div>

      <div class="col-span-6">
        <h2 class="text-lg font-medium dark:text-gray-100">
          {{ t`Opening Amount` }}
        </h2>

        <Table
          v-if="isValuesSeeded"
          class="mt-4 text-base"
          :df="getField('openingAmounts')"
          :show-header="true"
          :border="true"
          :max-rows-before-overflow="4"
          :value="posShiftDoc?.openingAmounts"
          :read-only="true"
          @row-change="handleChange"
        />

        <div class="mt-4 grid grid-cols-2 gap-4 items-end">
          <Button class="w-full py-5" type="secondary" @click="$router.back()">
            <span class="uppercase text-lg font-semibold">
              {{ t`Back` }}
            </span>
          </Button>

          <Button class="w-full py-5" type="primary" @click="handleSubmit">
            <span class="uppercase text-lg font-semibold">
              {{ t`Submit` }}
            </span>
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue';
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import Table from 'src/components/Controls/Table.vue';
import { AccountTypeEnum } from 'models/baseModels/Account/types';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { POSOpeningShift } from 'models/inventory/Point of Sale/POSOpeningShift';
import { fyo } from 'src/initFyo';
import { showToast } from 'src/utils/interactive';
import { t } from 'fyo';
import { ValidationError } from 'fyo/utils/errors';
import { getPOSOpeningShiftDoc } from 'src/utils/pos';

const emit = defineEmits<{
  (e: 'toggleModal', modalName: string): void;
}>();

const posShiftDoc = ref<POSOpeningShift | undefined>(undefined);
const isValuesSeeded = ref(false);

provide(
  'doc',
  computed(() => posShiftDoc.value)
);

const getDefaultCashDenominations = computed(() => {
  return fyo.singles.Defaults?.posCashDenominations;
});

const posCashAccount = computed(() => {
  return fyo.singles.POSSettings?.cashAccount;
});

const posOpeningCashAmount = computed<Money>(() => {
  return posShiftDoc.value?.openingCashAmount as Money;
});

async function seedDefaultCashDenomiations() {
  if (!posShiftDoc.value) {
    return;
  }

  posShiftDoc.value.openingCash = [];
  const denominations = getDefaultCashDenominations.value;

  if (!denominations) {
    return;
  }

  for (const row of denominations) {
    await posShiftDoc.value.append('openingCash', {
      denomination: row.denomination,
      count: 0,
    });
  }
}

async function seedPaymentMethods() {
  if (!posShiftDoc.value) {
    return;
  }

  posShiftDoc.value.openingAmounts = [];

  const paymentMethods = (
    (await fyo.db.getAll(ModelNameEnum.PaymentMethod, {
      fields: ['name'],
    })) as { name: string }[]
  ).map((doc) => ({ paymentMethod: doc.name, amount: fyo.pesa(0) }));

  await posShiftDoc.value.set('openingAmounts', paymentMethods);
}

async function seedDefaults() {
  if (posShiftDoc.value?.isShiftOpen) {
    return;
  }

  await seedDefaultCashDenomiations();
  await seedPaymentMethods();
}

function getField(fieldname: string) {
  return fyo.getField(ModelNameEnum.POSOpeningShift, fieldname);
}

function setOpeningCashAmount() {
  if (!posShiftDoc.value?.openingAmounts) {
    return;
  }

  posShiftDoc.value.openingAmounts.forEach((row) => {
    if (row.paymentMethod === 'Cash') {
      row.amount = posShiftDoc.value?.openingCashAmount as Money;
    }
  });
}

function handleChange() {
  setOpeningCashAmount();
}

async function handleSubmit() {
  try {
    if (posShiftDoc.value?.openingCashAmount.isNegative()) {
      throw new ValidationError(t`Opening Cash Amount can not be negative.`);
    }

    await posShiftDoc.value?.setMultiple({
      isShiftOpen: true,
      openingDate: new Date(),
    });

    await posShiftDoc.value?.sync();
    await fyo.singles.POSSettings?.setAndSync('isShiftOpen', true);

    if (posShiftDoc.value && !posShiftDoc.value.openingCashAmount.isZero()) {
      const jvDoc = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, {
        entryType: 'Journal Entry',
      });

      await jvDoc.append('accounts', {
        account: posCashAccount.value,
        debit: posShiftDoc.value.openingCashAmount as Money,
        credit: fyo.pesa(0),
      });

      await jvDoc.append('accounts', {
        account: AccountTypeEnum.Cash,
        debit: fyo.pesa(0),
        credit: posShiftDoc.value.openingCashAmount as Money,
      });

      await (await jvDoc.sync()).submit();
    }

    emit('toggleModal', 'ShiftOpen');
  } catch (error) {
    showToast({
      type: 'error',
      message: t`${error as string}`,
      duration: 'short',
    });
    return;
  }
}

onMounted(async () => {
  isValuesSeeded.value = false;
  posShiftDoc.value = await getPOSOpeningShiftDoc(fyo);

  await seedDefaults();
  isValuesSeeded.value = true;
});
</script>
