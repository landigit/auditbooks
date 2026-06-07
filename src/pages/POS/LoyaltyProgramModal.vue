<template>
  <view v-if="!isLynx">
    <Modal class="h-96 w-96" :set-close-listener="false">
      <text class="text-center py-4 text-main">Redeem Loyalty Points</text>

      <view class="border-b border-border" />

      <view class="flex gap-2 p-3 justify-end pt-10">
        <LucideIcon name="refresh-ccw" :size="20" class="text-indicator-orange-text" />

        <text class="text-main pr-6">{{ loyaltyPoints }} - ({{ loyaltyProgram }})</text>
      </view>

      <Int
        v-if="sinvDoc.fieldMap"
        class="flex-shrink-0 px-10 pb-10"
        :show-label="true"
        :border="true"
        :focus-input="true"
        :value="sinvDoc.loyaltyPoints"
        :df="sinvDoc.fieldMap.loyaltyPoints"
        @keydown.enter="setLoyaltyPoints"
        @change="updateLoyaltyPoints"
      />

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-2 px-10">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-green-bg"
            style="padding: 1.35rem"
            :disabled="validationError"
            @tap="setLoyaltyPoints()"
          >
            <slot>
              <text class="uppercase text-lg text-indicator-green-text font-semibold">
                {{ t`Save` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>

      <view class="row-start-6 grid grid-cols-2 gap-4 mt-auto px-10">
        <view class="col-span-2">
          <Button
            class="w-full bg-indicator-red-bg"
            style="padding: 1.35rem"
            @tap="cancelLoyaltyProgram"
          >
            <slot>
              <text class="uppercase text-lg text-indicator-red-text font-semibold">
                {{ t`Cancel` }}
              </text>
            </slot>
          </Button>
        </view>
      </view>
    </Modal>
  </view>
  <view
    v-else
    class="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4"
  >
    <view class="bg-canvas border border-border rounded-2xl w-full max-w-sm p-4 flex-col">
      <text class="text-lg font-bold text-main mb-3">{{ t`Redeem Loyalty Points` }}</text>
      <view class="border-b border-border mb-3" />

      <view
        class="flex-row items-center gap-2 mb-3 bg-canvas-muted p-3 rounded-lg border border-border"
      >
        <text class="text-sm text-main font-semibold flex-1">{{ loyaltyProgram }}</text>
        <text class="text-sm text-accent font-bold">{{ loyaltyPoints }} pts</text>
      </view>

      <view class="mb-4">
        <text class="text-sm font-semibold text-main mb-2">{{ t`Redeem Points` }}</text>
        <Int
          v-if="sinvDoc.fieldMap"
          :show-label="false"
          :border="true"
          :value="sinvDoc.loyaltyPoints"
          :df="sinvDoc.fieldMap.loyaltyPoints"
          @change="updateLoyaltyPoints"
        />
      </view>

      <view class="flex-row gap-2 mt-2">
        <view
          class="flex-1 py-2.5 rounded bg-danger-muted items-center justify-center"
          @tap="cancelLoyaltyProgram"
        >
          <text class="text-xs text-danger font-semibold">{{ t`Cancel` }}</text>
        </view>
        <view
          class="flex-1 py-2.5 rounded bg-success items-center justify-center"
          :class="validationError ? 'opacity-50' : ''"
          @tap="!validationError ? setLoyaltyPoints() : null"
        >
          <text class="text-xs text-white font-semibold">{{ t`Save` }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
import Button from "src/components/Button.vue";
import Modal from "src/components/Modal.vue";
import { SalesInvoice } from "models/baseModels/SalesInvoice/SalesInvoice";
import { t } from "fyo";
import { showToast } from "src/utils/interactive";
import { ModelNameEnum } from "models/types";
import Int from "src/components/Controls/Int.vue";
import LucideIcon from "src/components/LucideIcon.vue";
import { fyo } from "src/initFyo";
import { isLynx } from "src/utils/interactive";

/* Define Props */
const props = withDefaults(
  defineProps<{
    loyaltyPoints?: number;
    loyaltyProgram?: string;
  }>(),
  {
    loyaltyPoints: 0,
    loyaltyProgram: "",
  },
);

/* Define Emits */
const emit = defineEmits<{
  (e: "setLoyaltyPoints", value: number): void;
  (e: "toggleModal", value: string): void;
}>();

/* App Store / Context Injections */
const sinvDoc = inject("sinvDoc") as SalesInvoice;

/* Reactive State */
const validationError = ref(false);

/* Methods */
const setLoyaltyPoints = () => {
  emit("toggleModal", "LoyaltyProgram");
};

const cancelLoyaltyProgram = () => {
  emit("setLoyaltyPoints", 0);
  emit("toggleModal", "LoyaltyProgram");
};

const updateLoyaltyPoints = async (newValue: number) => {
  try {
    const partyData = await fyo.db.get(ModelNameEnum.Party, sinvDoc.party as string);
    if (!partyData.loyaltyProgram) {
      return;
    }
    const loyaltyProgramDoc = await fyo.db.getAll(ModelNameEnum.LoyaltyProgram, {
      fields: ["conversionFactor", "toDate"],
      filters: { name: partyData.loyaltyProgram as string },
    });
    const toDate = loyaltyProgramDoc[0]?.toDate as Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (toDate && new Date(toDate).getTime() < today.getTime()) {
      throw new Error(t`Loyalty program has expired and cannot be applied`);
    }
    if (props.loyaltyPoints >= newValue) {
      sinvDoc.loyaltyPoints = newValue;
    } else {
      throw new Error(`${sinvDoc.party as string} only has ${props.loyaltyPoints} points`);
    }
    const loyaltyPoint = newValue * ((loyaltyProgramDoc[0]?.conversionFactor as number) || 0);
    if (sinvDoc.baseGrandTotal?.lt(loyaltyPoint)) {
      throw new Error(t`no need ${newValue} points to purchase this item`);
    }
    if (newValue < 0) {
      throw new Error(t`Points must be greater than 0`);
    }
    emit("setLoyaltyPoints", sinvDoc.loyaltyPoints as number);
    validationError.value = false;
  } catch (error) {
    validationError.value = true;
    showToast({ type: "error", message: t`${error as string}` });
    return;
  }
};
</script>
