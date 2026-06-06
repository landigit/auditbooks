<template>
  <Modal class="w-11/12 max-w-4xl p-6">
    <text class="text-xl font-semibold text-center text-main pb-4">
      {{ t`Open POS Shift` }}
    </text>

    <view class="grid grid-cols-12 gap-6">
      <view class="col-span-6">
        <text class="text-lg font-medium text-main">
          {{ t`Cash In Denominations` }}
        </text>

        <Table
          v-if="isValuesSeeded"
          class="mt-4 text-base"
          :df="getField('openingCash')"
          :show-header="true"
          :border="true"
          :value="posShiftDoc?.openingCash"
          @row-change="handleChange"
        />
      </view>

      <view class="col-span-6">
        <text class="text-lg font-medium text-main">
          {{ t`Opening Amount` }}
        </text>

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

        <view class="mt-4 grid grid-cols-2 gap-4 items-end">
          <Button
            class="w-full py-5 bg-indicator-red-bg"
            @tap="router.back()"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-red-text font-semibold"
              >
                {{ t`Back` }}
              </text>
            </slot>
          </Button>

          <Button
            class="w-full py-5 bg-indicator-green-bg"
            @tap="handleSubmit"
          >
            <slot>
              <text
                class="uppercase text-lg text-indicator-green-text font-semibold"
              >
                {{ t`Submit` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>
    </view>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue';
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
import { useRouter } from 'vue-router';

// Define Emits
const emit = defineEmits<{
  (e: 'toggleModal', modal: string): void;
}>();

// Router Instance
const router = useRouter();

// Reactive State
const posShiftDoc = ref<POSOpeningShift | undefined>(undefined);
const isValuesSeeded = ref(false);

// Provide context to child elements
provide(
  'doc',
  computed(() => posShiftDoc.value)
);

// Computed Properties
const getDefaultCashDenominations = computed(() => {
  return fyo.singles.Defaults?.posCashDenominations;
});

const posCashAccount = computed(() => {
  return fyo.singles.POSSettings?.cashAccount;
});

const _posOpeningCashAmount = computed<Money>(() => {
  return posShiftDoc.value?.openingCashAmount as Money;
});

// Methods
const seedDefaultCashDenomiations = async () => {
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
};

const seedPaymentMethods = async () => {
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
};

const seedDefaults = async () => {
  if (posShiftDoc.value?.isShiftOpen) {
    return;
  }

  await seedDefaultCashDenomiations();
  await seedPaymentMethods();
};

const getField = (fieldname: string) => {
  return fyo.getField(ModelNameEnum.POSOpeningShift, fieldname);
};

const setOpeningCashAmount = () => {
  if (!posShiftDoc.value?.openingAmounts) {
    return;
  }

  posShiftDoc.value.openingAmounts.map((row) => {
    if (row.paymentMethod === 'Cash') {
      row.amount = posShiftDoc.value?.openingCashAmount;
    }
  });
};

const handleChange = () => {
  setOpeningCashAmount();
};

const handleSubmit = async () => {
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

    if (!posShiftDoc.value?.openingCashAmount.isZero()) {
      const jvDoc = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, {
        entryType: 'Journal Entry',
      });

      await jvDoc.append('accounts', {
        account: posCashAccount.value,
        debit: posShiftDoc.value?.openingCashAmount as Money,
        credit: fyo.pesa(0),
      });

      await jvDoc.append('accounts', {
        account: AccountTypeEnum.Cash,
        debit: fyo.pesa(0),
        credit: posShiftDoc.value?.openingCashAmount as Money,
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
};

// Lifecycles
onMounted(async () => {
  isValuesSeeded.value = false;
  posShiftDoc.value = await getPOSOpeningShiftDoc(fyo);

  await seedDefaults();
  isValuesSeeded.value = true;

  if (false) {
    console.log(_posOpeningCashAmount.value);
  }
});
</script>
