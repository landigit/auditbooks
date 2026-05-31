<template>
  <div>
    <OpenPOSShiftModal
      v-if="!isPosShiftOpen"
      :open-modal="!isPosShiftOpen"
      @toggle-modal="emitEvent('toggleModal', 'ShiftOpen')"
    />

    <ClosePOSShiftModal
      :open-modal="openShiftCloseModal"
      @toggle-modal="emitEvent('toggleModal', 'ShiftClose')"
    />

    <LoyaltyProgramModal
      :open-modal="openLoyaltyProgramModal"
      :loyalty-points="loyaltyPoints"
      :loyalty-program="loyaltyProgram"
      @toggle-modal="emitEvent('toggleModal', 'LoyaltyProgram')"
      @set-loyalty-points="(points) => emitEvent('setLoyaltyPoints', points)"
    />

    <BatchSelectionModal
      :open-modal="openBatchSelectionModal"
      :item-code="selectedItemForBatch || ''"
      @toggle-modal="emitEvent('toggleModal', 'BatchSelection')"
      @batch-selected="(batch) => emitEvent('batchSelected', batch)"
    />

    <SavedInvoiceModal
      :open-modal="openSavedInvoiceModal || false"
      :modal-status="openSavedInvoiceModal || false"
      @toggle-modal="emitEvent('toggleModal', 'SavedInvoice')"
      @selected-invoice-name="
        (invName) => emitEvent('selectedInvoiceName', invName)
      "
    />

    <CouponCodeModal
      :open-modal="openCouponCodeModal"
      @apply-pricing-rule="emitEvent('applyPricingRule')"
      @toggle-modal="emitEvent('toggleModal', 'CouponCode')"
      @set-coupons-count="(count) => emitEvent('setCouponsCount', count)"
    />

    <PriceListModal
      :open-modal="openPriceListModal"
      @toggle-modal="emitEvent('toggleModal', 'PriceList')"
    />

    <ItemEnquiryModal
      :open-modal="openItemEnquiryModal"
      @toggle-modal="emitEvent('toggleModal', 'ItemEnquiry')"
    />

    <PaymentModal
      :open-modal="openPaymentModal"
      @toggle-modal="emitEvent('toggleModal', 'Payment')"
      @set-paid-amount="(amount: Money) => emitEvent('setPaidAmount', amount)"
      @set-payment-method="
        (paymentMethod) => emitEvent('setPaymentMethod', paymentMethod)
      "
      @set-transfer-ref-no="(ref) => emitEvent('setTransferRefNo', ref)"
      @set-transfer-clearance-date="
        (date) => emitEvent('setTransferClearanceDate', date)
      "
      @create-transaction="
        (print, status) => emitEvent('createTransaction', print, status)
      "
    />

    <ReturnSalesInvoiceModal
      :open-modal="openReturnSalesInvoiceModal || false"
      :modal-status="openReturnSalesInvoiceModal || false"
      @selected-return-invoice="
        (value: any) => emitEvent('selectedReturnInvoice', value)
      "
      @toggle-modal="emitEvent('toggleModal', 'ReturnSalesInvoice')"
    />

    <AlertModal
      :open-modal="openAlertModal"
      @toggle-modal="emitEvent('toggleModal', 'Alert')"
      @save-and-continue="(value: any) => emitEvent('saveAndContinue', value)"
    />

    <div
      class="bg-canvas-muted grid grid-cols-12 gap-2 p-4"
      style="height: calc(100vh - var(--h-row-largest))"
    >
      <div class="col-span-5 bg-surface border rounded-md border-border">
        <div class="rounded-md p-4 col-span-5">
          <div class="flex gap-x-2">
            <!-- Item Search -->
            <MultiLabelLink
              class="w-full"
              secondary-link="barcode"
              third-link="itemCode"
              :df="{
                label: t`Search Item (Name or Barcode)`,
                fieldtype: 'Link',
                fieldname: 'item',
                target: 'Item',
              }"
              :border="true"
              :value="itemSearchTerm"
              :show-clear-button="true"
              @keyup.enter="
                (event: KeyboardEvent) =>
                  emitEvent(
                    'handleItemSearch',
                    (event.target as HTMLInputElement).value,
                    true
                  )
              "
              @change="(item: string) => emitEvent('handleItemSearch', item)"
            />

            <Link
              v-if="fyo.singles.AccountingSettings?.enableitemGroup"
              :df="{
                label: t`Filter by Group`,
                fieldtype: 'Link',
                fieldname: 'itemGroup',
                target: 'ItemGroup',
              }"
              :border="true"
              :show-clear-button="true"
              :value="selectedItemGroup"
              @change="(group: string) => emitEvent('setItemGroup', group)"
            />
          </div>

          <ItemsTable
            v-if="tableView"
            :items="items"
            :item-qty-map="itemQuantityMap as ItemQtyMap"
            :item-visibility="itemVisibility"
            @add-item="(item) => emitEvent('addItem', item)"
          />

          <ItemsGrid
            v-else
            :items="items"
            :item-qty-map="itemQuantityMap as ItemQtyMap"
            :item-visibility="itemVisibility"
            @add-item="(item) => emitEvent('addItem', item)"
          />

          <div class="flex fixed bottom-0 p-1 mb-7 gap-x-3">
            <POSQuickActions
              :sinv-doc="sinvDoc"
              :loyalty-points="loyaltyPoints"
              :loyalty-program="loyaltyProgram"
              :applied-coupons-count="appliedCouponsCount"
              @toggle-view="emitEvent('toggleView')"
              @emit-route-to-sinv-list="emitEvent('routeToSinvList')"
              @toggle-modal="(modalName) => emitEvent('toggleModal', modalName)"
            />
          </div>
        </div>
      </div>

      <div class="col-span-7">
        <div class="flex flex-col gap-3" style="height: calc(100vh - 6rem)">
          <div
            class="p-4 bg-surface border rounded-md grow h-full border-border"
          >
            <!-- Customer Search -->
            <MultiLabelLink
              v-if="sinvDoc?.fieldMap"
              class="flex-shrink-0"
              secondary-link="phone"
              :border="true"
              :value="sinvDoc?.party"
              :df="sinvDoc?.fieldMap.party"
              :show-clear-button="true"
              @change="(value: string) => emit('setCustomer', value)"
            />

            <SelectedItemTable
              :expanded-batch-id="expandedBatchId"
              @set-expanded-batch-id="
                (rowName) => emit('setExpandedBatchId', rowName)
              "
              @apply-pricing-rule="emitEvent('applyPricingRule')"
              @selected-row="(row) => emit('selectedRow', row)"
            />
          </div>

          <div class="p-3 bg-surface border rounded-md border-border">
            <div class="w-full grid grid-cols-2 gap-y-2 gap-x-3">
              <div class="flex flex-col justify-end">
                <div class="grid grid-cols-2 gap-2">
                  <FloatingLabelFloatInput
                    :df="{
                      label: t`Total Quantity`,
                      fieldtype: 'Int',
                      fieldname: 'totalQuantity',
                      minvalue: 0,
                      maxvalue: 1000,
                    }"
                    size="large"
                    :value="totalQuantity"
                    :read-only="true"
                    :text-right="true"
                  />

                  <FloatingLabelCurrencyInput
                    :df="{
                      label: t`Add'l Discounts`,
                      fieldtype: 'Int',
                      fieldname: 'additionalDiscount',
                      minvalue: 0,
                    }"
                    size="large"
                    :value="additionalDiscounts"
                    :read-only="true"
                    :text-right="true"
                    @change="(amount: Money) => (additionalDiscounts = amount)"
                  />
                </div>

                <div class="mt-4 grid grid-cols-2 gap-2">
                  <FloatingLabelCurrencyInput
                    :df="{
                      label: t`Item Discounts`,
                      fieldtype: 'Currency',
                      fieldname: 'itemDiscounts',
                    }"
                    size="large"
                    :value="itemDiscounts"
                    :read-only="true"
                    :text-right="true"
                  />

                  <FloatingLabelCurrencyInput
                    v-if="sinvDoc?.fieldMap"
                    :df="sinvDoc?.fieldMap.grandTotal"
                    size="large"
                    :value="sinvDoc?.grandTotal"
                    :read-only="true"
                    :text-right="true"
                  />
                </div>
              </div>
              <div class="w-full">
                <div class="w-full flex gap-2">
                  <Button
                    class="w-full"
                    :style="{
                      backgroundColor:
                        profile?.saveButtonColour ||
                        fyo.singles.Defaults?.saveButtonColour,
                    }"
                    :class="`${isReturnInvoiceEnabledReturn ? 'py-5' : 'py-6'}`"
                    @click="emit('saveInvoiceAction')"
                  >
                    <slot>
                      <p
                        class="uppercase text-lg text-button-primary-text font-semibold"
                      >
                        {{ t`Save` }}
                      </p>
                    </slot>
                  </Button>
                  <Button
                    class="w-full"
                    :style="{
                      backgroundColor:
                        profile?.cancelButtonColour ||
                        fyo.singles.Defaults?.cancelButtonColour,
                    }"
                    :class="`${isReturnInvoiceEnabledReturn ? 'py-5' : 'py-6'}`"
                    @click="() => emit('clearValues')"
                  >
                    <slot>
                      <p
                        class="uppercase text-lg text-button-primary-text font-semibold"
                      >
                        {{ t`Cancel` }}
                      </p>
                    </slot>
                  </Button>
                </div>
                <div
                  class="w-full flex gap-2"
                  :class="`${isReturnInvoiceEnabledReturn ? 'mt-2' : 'mt-4'}`"
                >
                  <Button
                    class="w-full"
                    :style="{
                      backgroundColor:
                        profile?.heldButtonColour ||
                        fyo.singles.Defaults?.heldButtonColour,
                    }"
                    :class="`${isReturnInvoiceEnabledReturn ? 'py-5' : 'py-6'}`"
                    @click="emitEvent('toggleModal', 'SavedInvoice', true)"
                  >
                    <slot>
                      <p
                        class="uppercase text-lg text-button-primary-text font-semibold"
                      >
                        {{ t`held` }}
                      </p>
                    </slot>
                  </Button>

                  <Button
                    v-if="isReturnInvoiceEnabledReturn"
                    class="w-full py-5"
                    :style="{
                      backgroundColor:
                        profile?.returnButtonColour ||
                        fyo.singles.Defaults?.returnButtonColour,
                    }"
                    @click="
                      emitEvent('toggleModal', 'ReturnSalesInvoice', true)
                    "
                  >
                    <slot>
                      <p
                        class="uppercase text-lg text-button-primary-text font-semibold"
                      >
                        {{ t`Return` }}
                      </p>
                    </slot>
                  </Button>
                  <Button
                    v-else
                    class="w-full"
                    :style="{
                      backgroundColor:
                        profile?.payButton ||
                        fyo.singles.Defaults?.payButtonColour,
                    }"
                    :class="`${isReturnInvoiceEnabledReturn ? 'py-5' : 'py-6'}`"
                    @click="emitEvent('handlePaymentAction')"
                  >
                    <slot>
                      <p
                        class="uppercase text-lg text-button-primary-text font-semibold"
                      >
                        {{ t`Pay` }}
                      </p>
                    </slot>
                  </Button>
                </div>
                <Button
                  v-if="isReturnInvoiceEnabledReturn"
                  class="w-full mt-2 py-5"
                  :style="{
                    backgroundColor:
                      profile?.payButtonColour ||
                      fyo.singles.Defaults?.payButtonColour,
                  }"
                  @click="emitEvent('handlePaymentAction')"
                >
                  <slot>
                    <p
                      class="uppercase text-lg text-button-primary-text font-semibold"
                    >
                      {{ t`Pay` }}
                    </p>
                  </slot>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Money } from 'pesa';
import { fyo } from 'src/initFyo';
import { getItem } from 'src/utils/api/pos.js';
import AlertModal from './AlertModal.vue';
import PaymentModal from './PaymentModal.vue';
import Button from 'src/components/Button.vue';
import PriceListModal from './PriceListModal.vue';
import ItemEnquiryModal from './ItemEnquiryModal.vue';
import { Item } from 'models/baseModels/Item/Item';
import CouponCodeModal from './CouponCodeModal.vue';
import POSQuickActions from './POSQuickActions.vue';
import { PosEmits } from 'src/components/POS/types';
import Link from 'src/components/Controls/Link.vue';
import SavedInvoiceModal from './SavedInvoiceModal.vue';
import OpenPOSShiftModal from './OpenPOSShiftModal.vue';
import ClosePOSShiftModal from './ClosePOSShiftModal.vue';
import LoyaltyProgramModal from './LoyaltyProgramModal.vue';
import { POSItem, ItemQtyMap } from 'src/components/POS/types';
import ItemsGrid from 'src/components/POS/Classic/ItemsGrid.vue';
import ItemsTable from 'src/components/POS/Classic/ItemsTable.vue';
import ReturnSalesInvoiceModal from './ReturnSalesInvoiceModal.vue';
import { POSProfile } from 'models/baseModels/POSProfile/PosProfile';
import MultiLabelLink from 'src/components/Controls/MultiLabelLink.vue';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import SelectedItemTable from 'src/components/POS/Classic/SelectedItemTable.vue';
import FloatingLabelFloatInput from 'src/components/POS/FloatingLabelFloatInput.vue';
import FloatingLabelCurrencyInput from 'src/components/POS/FloatingLabelCurrencyInput.vue';
import { AppliedCouponCodes } from 'models/baseModels/AppliedCouponCodes/AppliedCouponCodes';
import BatchSelectionModal from 'src/pages/POS/BatchSelectionModal.vue';
import { t } from 'fyo';

// Define Props
defineProps<{
  paidAmount?: Money;
  tableView?: boolean;
  itemDiscounts?: Money;
  openAlertModal?: boolean;
  isPosShiftOpen?: boolean;
  disablePayButton?: boolean;
  openPaymentModal?: boolean;
  openPriceListModal?: boolean;
  openItemEnquiryModal?: boolean;
  openCouponCodeModal?: boolean;
  openShiftCloseModal?: boolean;
  openSavedInvoiceModal?: boolean;
  openLoyaltyProgramModal?: boolean;
  openAppliedCouponsModal?: boolean;
  openReturnSalesInvoiceModal?: boolean;
  openBatchSelectionModal?: boolean;
  totalQuantity?: number;
  loyaltyPoints?: number;
  itemSearchTerm?: string;
  selectedItemGroup?: string;
  loyaltyProgram?: string;
  appliedCouponsCount?: number;
  sinvDoc?: SalesInvoice;
  itemQuantityMap?: ItemQtyMap;
  coupons?: AppliedCouponCodes;
  items?: POSItem[];
  itemVisibility?: string;
  profile?: POSProfile | null;
  batchAddedItems?: string[];
  selectedItemForBatch?: string;
  expandedBatchId?: string;
}>();

// Define Emits
const emit = defineEmits<{
  (e: 'setExpandedBatchId', rowName: string | undefined): void;
  (e: 'addItem', item: any): void;
  (e: 'toggleView'): void;
  (e: 'toggleModal', modalName: PosEmits, value?: any): void;
  (e: 'setCustomer', value: string): void;
  (e: 'clearValues'): void;
  (e: 'setItemGroup', group: string): void;
  (e: 'setPaidAmount', amount: any): void;
  (e: 'setCouponsCount', count: number): void;
  (e: 'routeToSinvList'): void;
  (e: 'handleItemSearch', term: string, keyup?: boolean): void;
  (e: 'setPaymentMethod', paymentMethod: string): void;
  (e: 'setTransferRefNo', ref: string): void;
  (e: 'setLoyaltyPoints', points: number): void;
  (e: 'applyPricingRule'): void;
  (e: 'saveInvoiceAction'): void;
  (e: 'createTransaction', print?: boolean, status?: boolean): void;
  (e: 'setTransferAmount', amount: any): void;
  (e: 'selectedInvoiceName', invName: string): void;
  (e: 'selectedReturnInvoice', value: any): void;
  (e: 'setTransferClearanceDate', date: Date): void;
  (e: 'saveAndContinue', value: any): void;
  (e: 'handlePaymentAction'): void;
  (e: 'selectedRow', row: any): void;
  (e: 'batchSelected', batch: any): void;
}>();

// Reactive State
const itemGroupFilter = ref('');
const additionalDiscounts = ref<Money>(fyo.pesa(0));

// Computed Properties
const isReturnInvoiceEnabledReturn = computed(() => {
  return fyo.singles.AccountingSettings?.enableInvoiceReturns ?? undefined;
});

// Methods
const emitEvent = (eventName: any, ...args: any[]) => {
  emit(eventName, ...args);
};

// Preserve unused core definitions safely
if (false) {
  console.log(getItem);
  console.log(itemGroupFilter.value);
  const _testItem: Item = {} as any;
  console.log(_testItem);
}
</script>
