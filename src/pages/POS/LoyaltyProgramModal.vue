<template>
  <Dialog :open="modalStatus" @update:open="setLoyaltyPoints">
    <DialogContent
      class="sm:max-w-[450px] p-0 overflow-hidden border-none bg-transparent shadow-none"
    >
      <div
        class="bg-white dark:bg-gray-875 border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95"
      >
        <!-- Header -->
        <div
          class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-890 flex items-center justify-between"
        >
          <div class="flex flex-col gap-1">
            <h3
              class="text-xs font-semibold normal-case tracking-[0.3em] text-primary dark:text-primary flex items-center gap-2"
            >
              <LucideIcon name="star" class="w-4 h-4 text-primary" />
              {{ t`Redeem Points` }}
            </h3>
            <p
              class="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-normal normal-case"
            >
              {{ loyaltyProgram || t`No Program` }}
            </p>
          </div>
          <div
            class="bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
          >
            <span class="text-xs font-semibold text-primary"
              >{{ loyaltyPoints }} {{ t`Available` }}</span
            >
          </div>
        </div>

        <!-- Content -->
        <div class="p-8 space-y-6">
          <div class="space-y-4">
            <div class="relative group">
              <label
                class="text-[10px] font-semibold normal-case tracking-normal text-gray-500 dark:text-gray-400 mb-2 block"
                >{{ t`Points to Redeem` }}</label
              >
              <div class="relative">
                <Input
                  ref="pointsInput"
                  v-model="redemptionPoints"
                  type="number"
                  class="h-16 rounded-lg bg-gray-50 dark:bg-gray-890 border-gray-100 dark:border-gray-800 focus:border-primary/50 focus:ring-primary/20 transition-all pl-6 text-xl font-semibold"
                  @keydown.enter="handleSave"
                />
                <LucideIcon
                  name="coins"
                  class="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-primary/30 group-focus-within:text-primary transition-colors"
                />
              </div>
            </div>

            <div
              class="bg-primary/5 rounded-lg p-4 border border-primary/10 flex items-center gap-4"
            >
              <div
                class="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center"
              >
                <LucideIcon name="info" class="w-5 h-5 text-primary" />
              </div>
              <div>
                <p
                  class="text-[10px] font-bold text-primary normal-case tracking-normal"
                >
                  {{ t`Redemption Value` }}
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {{
                    t`Your points will be converted based on the program rules.`
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-8 py-6 bg-gray-50 dark:bg-gray-890 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4"
        >
          <UIButton
            variant="outline"
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-all text-red-400"
            @click="cancelLoyaltyProgram"
          >
            {{ t`Cancel` }}
          </UIButton>
          <UIButton
            class="h-14 rounded-lg font-semibold normal-case tracking-normal text-[10px] shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
            :disabled="validationError"
            @click="handleSave"
          >
            {{ t`Redeem Now` }}
          </UIButton>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts">
import Dialog from 'src/components/ui/Dialog.vue';
import DialogContent from 'src/components/ui/DialogContent.vue';
import Input from 'src/components/ui/Input.vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { defineComponent, inject } from 'vue';
import { t } from 'fyo';
import { showToast } from 'src/utils/interactive';
import { ModelNameEnum } from 'models/types';
import { LoyaltyPointsSchema } from 'src/shared/schemas';

export default defineComponent({
  name: 'LoyaltyProgramModal',
  components: {
    Dialog,
    DialogContent,
    Input,
    LucideIcon,
  },
  props: {
    modalStatus: Boolean,
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
      t,
      sinvDoc: inject('sinvDoc') as SalesInvoice,
    };
  },
  data() {
    return {
      redemptionPoints: 0,
      validationError: false,
    };
  },
  watch: {
    modalStatus(newVal) {
      if (newVal) {
        this.redemptionPoints = (this.sinvDoc.loyaltyPoints as number) || 0;
      }
    },
    redemptionPoints(newVal) {
      this.validatePoints(newVal);
    },
  },
  methods: {
    validatePoints(value: any) {
      const result = LoyaltyPointsSchema.safeParse({ points: value });
      if (!result.success) {
        this.validationError = true;
        return;
      }
      this.validationError = false;
    },
    cancelLoyaltyProgram() {
      this.$emit('setLoyaltyPoints', 0);
      this.$emit('toggleModal', 'LoyaltyProgram');
    },
    async handleSave() {
      if (this.validationError) return;
      await this.updateLoyaltyPoints(Number(this.redemptionPoints));
    },
    async updateLoyaltyPoints(newValue: number) {
      try {
        const partyData = await this.fyo.db.get(
          ModelNameEnum.Party,
          this.sinvDoc.party as string
        );

        if (!partyData.loyaltyProgram) {
          throw new Error(t`No loyalty program found for this customer`);
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

        if (newValue > this.loyaltyPoints) {
          throw new Error(
            t`${this.sinvDoc.party as string} only has ${this.loyaltyPoints} points`
          );
        }

        const loyaltyPointValue =
          newValue * ((loyaltyProgramDoc[0]?.conversionFactor as number) || 0);

        if (this.sinvDoc.baseGrandTotal?.lt(loyaltyPointValue)) {
          throw new Error(t`Points value exceeds invoice total`);
        }

        if (newValue < 0) {
          throw new Error(t`Points must be greater than 0`);
        }

        this.sinvDoc.loyaltyPoints = newValue;
        this.$emit('setLoyaltyPoints', newValue);
        this.$emit('toggleModal', 'LoyaltyProgram');

        this.validationError = false;
      } catch (error: any) {
        this.validationError = true;
        showToast({
          type: 'error',
          message: error.message || t`An error occurred`,
        });
      }
    },
    setLoyaltyPoints() {
      this.$emit('toggleModal', 'LoyaltyProgram');
    },
  },
});
</script>
