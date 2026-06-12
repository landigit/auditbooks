<template>
  <div class="flex-col">
    <PageHeader :title="t`Point of Sale`">
      <slot>
        <Button
          class="bg-red-500 dark:bg-red-700"
          @click="toggleModal('ShiftClose')"
        >
          <feather-icon name="log-out" class="w-4 h-4 me-1.5 text-white" />
          <span class="font-medium text-white">{{ t`Close POS Shift ` }}</span>
        </Button>
      </slot>
    </PageHeader>
    <ClassicPOS
      v-if="
        posProfile?.posUI === 'Classic' ||
        (!posProfile?.posUI && fyo.singles.POSSettings?.posUI === 'Classic')
      "
      :table-view="tableView"
      :profile="(posProfile as POSProfile)"
      :total-quantity="totalQuantity"
      :item-quantity-qap="itemQtyMap"
      :loyalty-points="loyaltyPoints"
      :loyalty-program="loyaltyProgram"
      :open-alert-modal="openAlertModal"
      :default-customer="defaultCustomer"
      :item-search-term="itemSearchTerm"
      :selected-item-group="selectedItemGroup"
      :is-pos-shift-open="isPosShiftOpen"
      :items="(items as [] as POSItem[])"
      :item-visibility="itemVisibility"
      :sinv-doc="(sinvDoc as SalesInvoice)"
      :disable-pay-button="disablePayButton"
      :open-payment-modal="openPaymentModal"
      :item-discounts="(itemDiscounts as Money)"
      :coupons="(coupons as AppliedCouponCodes)"
      :open-price-list-modal="openPriceListModal"
      :open-item-enquiry-modal="openItemEnquiryModal"
      :applied-coupons-count="appliedCouponsCount"
      :open-shift-close-modal="openShiftCloseModal"
      :open-coupon-code-modal="openCouponCodeModal"
      :open-saved-invoice-modal="openSavedInvoiceModal"
      :open-loyalty-program-modal="openLoyaltyProgramModal"
      :open-applied-coupons-modal="openAppliedCouponsModal"
      :open-return-sales-invoice-modal="openReturnSalesInvoiceModal"
      :open-batch-selection-modal="openBatchSelectionModal"
      :selected-item-for-batch="selectedItemForBatch"
      :expanded-batch-id="expandedBatchId"
      @set-expanded-batch-id="setExpandedBatchId"
      @add-item="addItem"
      @toggle-view="toggleView"
      @set-sinv-doc="setSinvDoc"
      @clear-values="clearValues"
      @set-customer="setCustomer"
      @toggle-modal="toggleModal"
      @set-item-group="setItemGroup"
      @handle-item-search="handleItemSearch"
      @set-paid-amount="setPaidAmount"
      @set-payment-method="setPaymentMethod"
      @set-coupons-count="setCouponsCount"
      @route-to-sinv-list="routeToSinvList"
      @set-loyalty-points="setLoyaltyPoints"
      @set-transfer-ref-no="setTransferRefNo"
      @apply-pricing-rule="applyPricingRule"
      @create-transaction="createTransaction"
      @save-invoice-action="saveInvoiceAction"
      @set-transfer-amount="setTransferAmount"
      @selected-invoice-name="selectedInvoiceName"
      @selected-return-invoice="selectedReturnInvoice"
      @set-transfer-clearance-date="setTransferClearanceDate"
      @save-and-continue="handleSaveAndContinue"
      @handle-payment-action="handlePaymentAction"
      @selected-row="setQuickQtySelectedRow"
      @batch-selected="handleBatchSelected"
    />
    <ModernPOS
      v-else
      :table-view="tableView"
      :profile="(posProfile as POSProfile)"
      :total-quantity="totalQuantity"
      :item-quantity-qap="itemQtyMap"
      :loyalty-points="loyaltyPoints"
      :loyalty-program="loyaltyProgram"
      :open-alert-modal="openAlertModal"
      :default-customer="defaultCustomer"
      :item-search-term="itemSearchTerm"
      :selected-item-group="selectedItemGroup"
      :is-pos-shift-open="isPosShiftOpen"
      :items="(items as [] as POSItem[])"
      :item-visibility="itemVisibility"
      :sinv-doc="(sinvDoc as SalesInvoice)"
      :disable-pay-button="disablePayButton"
      :open-payment-modal="openPaymentModal"
      :open-keyboard-modal="openKeyboardModal"
      :item-discounts="(itemDiscounts as Money)"
      :coupons="(coupons as AppliedCouponCodes)"
      :open-price-list-modal="openPriceListModal"
      :open-item-enquiry-modal="openItemEnquiryModal"
      :applied-coupons-count="appliedCouponsCount"
      :open-shift-close-modal="openShiftCloseModal"
      :open-coupon-code-modal="openCouponCodeModal"
      :open-saved-invoice-modal="openSavedInvoiceModal"
      :open-loyalty-program-modal="openLoyaltyProgramModal"
      :open-applied-coupons-modal="openAppliedCouponsModal"
      :open-return-sales-invoice-modal="openReturnSalesInvoiceModal"
      :open-batch-selection-modal="openBatchSelectionModal"
      :selected-item-for-batch="selectedItemForBatch"
      :expanded-batch-id="expandedBatchId"
      @set-expanded-batch-id="setExpandedBatchId"
      @add-item="addItem"
      @toggle-view="toggleView"
      @set-sinv-doc="setSinvDoc"
      @clear-values="clearValues"
      @set-customer="setCustomer"
      @toggle-modal="toggleModal"
      @set-item-group="setItemGroup"
      @handle-item-search="handleItemSearch"
      @set-paid-amount="setPaidAmount"
      @set-payment-method="setPaymentMethod"
      @set-coupons-count="setCouponsCount"
      @route-to-sinv-list="routeToSinvList"
      @apply-pricing-rule="applyPricingRule"
      @set-loyalty-points="setLoyaltyPoints"
      @set-transfer-ref-no="setTransferRefNo"
      @create-transaction="createTransaction"
      @save-invoice-action="saveInvoiceAction"
      @set-transfer-amount="setTransferAmount"
      @selected-invoice-name="selectedInvoiceName"
      @selected-return-invoice="selectedReturnInvoice"
      @save-and-continue="handleSaveAndContinue"
      @set-transfer-clearance-date="setTransferClearanceDate"
      @selected-row="setQuickQtySelectedRow"
      @handle-payment-action="handlePaymentAction"
      @batch-selected="handleBatchSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, onMounted } from 'vue';
import { Money } from 'pesa';
import Button from 'src/components/Button.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ModernPOS from 'src/pages/POS/ModernPOS.vue';
import ClassicPOS from 'src/pages/POS/ClassicPOS.vue';
import { POSProfile } from 'models/baseModels/POSProfile/PosProfile';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { AppliedCouponCodes } from 'models/baseModels/AppliedCouponCodes/AppliedCouponCodes';
import { POSItem } from 'src/components/POS/types';
import { useApp } from 'src/composables/useApp';
import { usePOS } from 'src/composables/usePOS';

const { t, fyo } = useApp();

const {
  tableView,
  toggleView,
  items,
  openAlertModal,
  openPaymentModal,
  openKeyboardModal,
  openPriceListModal,
  openItemEnquiryModal,
  openCouponCodeModal,
  openShiftCloseModal,
  openSavedInvoiceModal,
  openLoyaltyProgramModal,
  openAppliedCouponsModal,
  openReturnSalesInvoiceModal,
  openBatchSelectionModal,
  totalQuantity,
  paidAmount,
  itemDiscounts,
  transferAmount,
  totalTaxedAmount,
  loyaltyPoints,
  loyaltyProgram,
  appliedCouponsCount,
  coupons,
  itemSearchTerm,
  selectedItemGroup,
  paymentMethod,
  transferRefNo,
  defaultCustomer,
  transferClearanceDate,
  sinvDoc,
  posProfile,
  itemQtyMap,
  itemSerialNumbers,
  selectedItemForBatch,
  expandedBatchId,
  isDiscountingEnabled,
  isPosShiftOpen,
  itemVisibility,
  disablePayButton,
  setQuickQtySelectedRow,
  setExpandedBatchId,
  addItem,
  setSinvDoc,
  clearValues,
  setCustomer,
  toggleModal,
  setItemGroup,
  handleItemSearch,
  setPaidAmount,
  setPaymentMethod,
  setCouponsCount,
  routeToSinvList,
  setLoyaltyPoints,
  setTransferRefNo,
  applyPricingRule,
  createTransaction,
  saveInvoiceAction,
  setTransferAmount,
  selectedInvoiceName,
  selectedReturnInvoice,
  setTransferClearanceDate,
  handleSaveAndContinue,
  handlePaymentAction,
  handleBatchSelected,
} = usePOS();

provide('doc', computed(() => sinvDoc.value));
provide('sinvDoc', computed(() => sinvDoc.value));
provide('coupons', computed(() => coupons.value));
provide('itemQtyMap', computed(() => itemQtyMap.value));
provide('paidAmount', computed(() => paidAmount.value));
provide('paymentMethod', computed(() => paymentMethod.value));
provide('transferRefNo', computed(() => transferRefNo.value));
provide('itemDiscounts', computed(() => itemDiscounts.value));
provide('transferAmount', computed(() => transferAmount.value));
provide('appliedCoupons', computed(() => sinvDoc.value.coupons));
provide('totalTaxedAmount', computed(() => totalTaxedAmount.value));
provide('itemSerialNumbers', computed(() => itemSerialNumbers.value));
provide('isDiscountingEnabled', computed(() => isDiscountingEnabled.value));
provide('transferClearanceDate', computed(() => transferClearanceDate.value));
provide('posSettings', computed(() => fyo.singles.POSSettings));

onMounted(() => {
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.pos = {
      tableView,
      items,
      openAlertModal,
      openPaymentModal,
      openKeyboardModal,
      openPriceListModal,
      openItemEnquiryModal,
      openCouponCodeModal,
      openShiftCloseModal,
      openSavedInvoiceModal,
      openLoyaltyProgramModal,
      openAppliedCouponsModal,
      openReturnSalesInvoiceModal,
      openBatchSelectionModal,
      totalQuantity,
      paidAmount,
      itemDiscounts,
      transferAmount,
      totalTaxedAmount,
      loyaltyPoints,
      loyaltyProgram,
      appliedCouponsCount,
      coupons,
      itemSearchTerm,
      selectedItemGroup,
      paymentMethod,
      transferRefNo,
      defaultCustomer,
      transferClearanceDate,
      sinvDoc,
      posProfile,
      itemQtyMap,
      itemSerialNumbers,
      selectedItemForBatch,
      expandedBatchId,
      isDiscountingEnabled,
      isPosShiftOpen,
      itemVisibility,
      disablePayButton,
      setQuickQtySelectedRow,
      setExpandedBatchId,
      addItem,
      setSinvDoc,
      clearValues,
      setCustomer,
      toggleModal,
      setItemGroup,
      handleItemSearch,
      setPaidAmount,
      setPaymentMethod,
      setCouponsCount,
      routeToSinvList,
      setLoyaltyPoints,
      setTransferRefNo,
      applyPricingRule,
      createTransaction,
      saveInvoiceAction,
      setTransferAmount,
      selectedInvoiceName,
      selectedReturnInvoice,
      setTransferClearanceDate,
      handleSaveAndContinue,
      handlePaymentAction,
      handleBatchSelected,
    };
  }
});
</script>
