<template>
  <Modal class="h-96 w-96" :set-close-listener="false">
    <p class="text-center py-4 text-main">Redeem Loyalty Points</p>

    <hr class="border-border" />

    <div class="flex gap-2 p-3 justify-end pt-10">
      <LucideIcon
        name="refresh-ccw"
        :size="20"
        class="text-indicator-orange-text"
      />

      <p class="text-main pr-6">{{ loyaltyPoints }} - ({{ loyaltyProgram }})</p>
    </div>

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

    <div class="row-start-6 grid grid-cols-2 gap-4 mt-auto mb-2 px-10">
      <div class="col-span-2">
        <Button
          class="w-full bg-indicator-green-bg"
          style="padding: 1.35rem"
          :disabled="validationError"
          @click="setLoyaltyPoints()"
        >
          <slot>
            <p
              class="uppercase text-lg text-indicator-green-text font-semibold"
            >
              {{ t`Save` }}
            </p>
          </slot>
        </Button>
      </div>
    </div>

    <div class="row-start-6 grid grid-cols-2 gap-4 mt-auto px-10">
      <div class="col-span-2">
        <Button
          class="w-full bg-indicator-red-bg"
          style="padding: 1.35rem"
          @click="cancelLoyaltyProgram"
        >
          <slot>
            <p class="uppercase text-lg text-indicator-red-text font-semibold">
              {{ t`Cancel` }}
            </p>
          </slot>
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import Button from 'src/components/Button.vue';
import Modal from 'src/components/Modal.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { defineComponent, inject } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import { ModelNameEnum } from 'models/types';
import Int from 'src/components/Controls/Int.vue';
import LucideIcon from 'src/components/LucideIcon.vue';

export default defineComponent({
  name: 'LoyaltyProgramModal',
  components: {
    Modal,
    Button,
    Int,
    LucideIcon,
  },
  props: {
    loyaltyPoints: {
      type: Number,
      default: 0,
    },

    loyaltyProgram: {
      type: String,
      default: '',
    },
  },
  emits: ['setLoyaltyPoints', 'toggleModal'],
  setup() {
    return {
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      validationError: false,
    };
  },
  methods: {
    async keydownEnter(value: number) {
      await this.updateLoyaltyPoints(value);
      this.setLoyaltyPoints();
    },
    cancelLoyaltyProgram() {
      this.$emit('setLoyaltyPoints', 0);
      this.$emit('toggleModal', 'LoyaltyProgram');
    },
    async updateLoyaltyPoints(newValue: number) {
      try {
        const partyData = await this.fyo.db.get(
          ModelNameEnum.Party,
          this.sinvDoc.party as string
        );

        if (!partyData.loyaltyProgram) {
          return;
        }

        const loyaltyProgramDoc = await this.fyo.db.getAll(
          ModelNameEnum.LoyaltyProgram,
          {
            fields: ['conversionFactor', 'toDate'],
            filters: { name: partyData.loyaltyProgram as string },
          }
        );

        const toDate = loyaltyProgramDoc[0]?.toDate as Date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (toDate && new Date(toDate).getTime() < today.getTime()) {
          throw new Error(t`Loyalty program has expired and cannot be applied`);
        }

        if (this.loyaltyPoints >= newValue) {
          this.sinvDoc.loyaltyPoints = newValue;
        } else {
          throw new Error(
            `${this.sinvDoc.party as string} only has ${
              this.loyaltyPoints
            } points`
          );
        }

        const loyaltyPoint =
          newValue * ((loyaltyProgramDoc[0]?.conversionFactor as number) || 0);

        if (this.sinvDoc.baseGrandTotal?.lt(loyaltyPoint)) {
          throw new Error(t`no need ${newValue} points to purchase this item`);
        }

        if (newValue < 0) {
          throw new Error(t`Points must be greater than 0`);
        }

        this.$emit('setLoyaltyPoints', this.sinvDoc.loyaltyPoints);

        this.validationError = false;
      } catch (error) {
        this.validationError = true;

        showToast({
          type: 'error',
          message: t`${error as string}`,
        });

        return;
      }
    },
    setLoyaltyPoints() {
      this.$emit('toggleModal', 'LoyaltyProgram');
    },
  },
});
</script>
