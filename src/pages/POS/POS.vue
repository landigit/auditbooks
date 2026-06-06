<template>
  <view v-if="!isLynx">
    <view class="flex-col">
      <PageHeader :title="t`Point of Sale`">
        <slot>
          <Button
            class="bg-error hover:bg-error-hover"
            @tap="toggleModal('ShiftClose')"
          >
            <text
              class="font-medium text-button-primary-text hidden md:inline"
              >{{ t`Close POS Shift` }}</text
            >
            <text class="font-medium text-button-primary-text md:hidden">{{
              t`Close Shift`
            }}</text>
          </Button>
        </slot>
      </PageHeader>
      <ClassicPOS
        v-if="
          posProfile?.posUI === 'Classic' ||
          (!posProfile?.posUI && fyo.singles.POSSettings?.posUI === 'Classic')
        "
        :table-view="tableView"
        :profile="posProfile as POSProfile"
        :total-quantity="totalQuantity"
        :item-quantity-qap="itemQtyMap"
        :loyalty-points="loyaltyPoints"
        :loyalty-program="loyaltyProgram"
        :open-alert-modal="openAlertModal"
        :default-customer="defaultCustomer"
        :item-search-term="itemSearchTerm"
        :selected-item-group="selectedItemGroup"
        :is-pos-shift-open="isPosShiftOpen"
        :items="items as [] as POSItem[]"
        :item-visibility="itemVisibility"
        :sinv-doc="sinvDoc as SalesInvoice"
        :disable-pay-button="disablePayButton"
        :open-payment-modal="openPaymentModal"
        :item-discounts="itemDiscounts as Money"
        :coupons="coupons as AppliedCouponCodes"
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
        :profile="posProfile as POSProfile"
        :total-quantity="totalQuantity"
        :item-quantity-qap="itemQtyMap"
        :loyalty-points="loyaltyPoints"
        :loyalty-program="loyaltyProgram"
        :open-alert-modal="openAlertModal"
        :default-customer="defaultCustomer"
        :item-search-term="itemSearchTerm"
        :selected-item-group="selectedItemGroup"
        :is-pos-shift-open="isPosShiftOpen"
        :items="items as [] as POSItem[]"
        :item-visibility="itemVisibility"
        :sinv-doc="sinvDoc as SalesInvoice"
        :disable-pay-button="disablePayButton"
        :open-payment-modal="openPaymentModal"
        :open-keyboard-modal="openKeyboardModal"
        :item-discounts="itemDiscounts as Money"
        :coupons="coupons as AppliedCouponCodes"
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
    </view>
  </view>
  <view v-else class="MainView">
    <view class="NavBar">
      <view class="BackBtn" @tap="router.back()">
        <text class="BackBtnText">⬅️ Back</text>
      </view>
      <view class="NavBrand">
        <text class="BrandText">Point of Sale</text>
      </view>
      <view class="flex flex-row gap-2">
        <view
          class="Btn Btn--secondary px-3 py-1.5 rounded-lg"
          @tap="toggleModal('ShiftClose')"
        >
          <text class="BtnText text-xs">Close Shift</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y="true" class="DeskContent px-4 py-2">
      <!-- Pick Customer -->
      <view class="mb-4">
        <text class="text-sm font-semibold text-main mb-2">Customer</text>
        <AutoComplete
          :df="
            {
              fieldname: 'customer',
              label: t`Customer`,
              fieldtype: 'Link',
              target: 'Party',
            } as any
          "
          class="w-full"
          :border="true"
          :value="sinvDoc.party"
          size="small"
          @change="(val: any) => setCustomer(val)"
        />
      </view>

      <!-- Cart Item list -->
      <view class="mb-6">
        <text class="text-sm font-semibold text-main mb-2"
          >Cart ({{ totalQuantity }} items)</text
        >
        <view
          v-if="!sinvDoc.items?.length"
          class="p-6 bg-surface border border-border rounded-xl flex items-center justify-center"
        >
          <text class="text-xs text-description"
            >Cart is empty. Add items below.</text
          >
        </view>
        <view v-else class="space-y-3">
          <view
            v-for="item in sinvDoc.items"
            :key="item.item"
            class="p-4 bg-surface border border-border rounded-xl flex flex-row justify-between items-center"
          >
            <view class="flex-1 mr-4">
              <text class="text-sm font-medium text-main">{{
                item.itemName || item.item
              }}</text>
              <text class="text-xs text-description mt-0.5"
                >{{ item.qty }} x
                {{ formatCurrency(item.rate?.float || item.rate || 0) }}</text
              >
            </view>
            <view class="flex flex-row items-center gap-2">
              <view
                class="p-1 rounded bg-surface border border-border"
                @tap="nativeChangeQty(item, -1)"
              >
                <text class="text-xs font-bold">-</text>
              </view>
              <text class="text-sm font-semibold text-main w-8 text-center">{{
                item.qty
              }}</text>
              <view
                class="p-1 rounded bg-surface border border-border"
                @tap="nativeChangeQty(item, 1)"
              >
                <text class="text-xs font-bold">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Item Catalog / Selector -->
      <view class="mb-6">
        <text class="text-sm font-semibold text-main mb-2">Add Items</text>
        <view class="mb-3">
          <input
            v-model="itemSearchTerm"
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-main"
            placeholder="Search items..."
            @input="handleItemSearch(itemSearchTerm)"
          />
        </view>
        <scroll-view
          scroll-y="true"
          class="h-64 border border-border rounded-xl bg-surface p-2"
        >
          <view
            v-for="item in items"
            :key="item.name"
            class="p-3 border-b border-border last:border-0 flex flex-row justify-between items-center"
            @tap="addItem(item as any, 1)"
          >
            <view class="flex-1">
              <text class="text-sm font-medium text-main">{{ item.name }}</text>
              <text class="text-xs text-description mt-0.5"
                >Code: {{ item.name }}</text
              >
            </view>
            <text class="text-sm font-semibold text-blue-600">{{
              formatCurrency(item.rate?.float || item.rate || 0)
            }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- Pricing Rule / Summary -->
      <view
        v-if="sinvDoc.items?.length"
        class="mb-6 p-4 bg-surface border border-border rounded-xl space-y-2"
      >
        <view class="flex justify-between">
          <text class="text-xs text-description">Subtotal</text>
          <text class="text-xs text-main">{{
            formatCurrency((sinvDoc.total as any)?.float || sinvDoc.total || 0)
          }}</text>
        </view>
        <view class="flex justify-between">
          <text class="text-xs text-description">Discounts</text>
          <text class="text-xs text-red-500"
            >-
            {{
              formatCurrency(itemDiscounts.float || itemDiscounts || 0)
            }}</text
          >
        </view>
        <view class="flex justify-between border-t border-border pt-2">
          <text class="text-sm font-semibold text-main">Total</text>
          <text class="text-sm font-bold text-blue-600">{{
            formatCurrency(sinvDoc.grandTotal?.float || sinvDoc.grandTotal || 0)
          }}</text>
        </view>
      </view>

      <!-- Pay Button -->
      <view v-if="sinvDoc.items?.length" class="mb-8">
        <view
          class="Btn w-full py-3 rounded-lg flex items-center justify-center"
          :class="disablePayButton ? 'bg-blue-600/50' : 'bg-blue-600'"
          @tap="saveOrder"
        >
          <text class="BtnText BtnText--primary text-white font-bold"
            >Checkout & Save</text
          >
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { t } from "fyo";
import router from "src/router";
import { isLynx } from "src/utils/interactive";
import AutoComplete from "src/components/Controls/AutoComplete.vue";
import { Money } from "pesa";
import { fyo } from "src/initFyo";
import ModernPOS from "./ModernPOS.vue";
import ClassicPOS from "./ClassicPOS.vue";
import { ModelNameEnum } from "models/types";
import Button from "src/components/Button.vue";
import { showToast } from "src/utils/interactive";
import { Item } from "models/baseModels/Item/Item";
import { Shipment } from "models/inventory/Shipment";
import { routeTo, toggleSidebar } from "src/utils/ui";
import { shortcutsKey } from "src/utils/injectionKeys";
import PageHeader from "src/components/PageHeader.vue";
import {
  computed,
  inject,
  ref,
  provide,
  onMounted,
  onActivated,
  onDeactivated,
  watch,
} from "vue";
import { Payment } from "models/baseModels/Payment/Payment";
import { ModalName, modalNames } from "src/components/POS/types";
import { POSProfile } from "models/baseModels/POSProfile/PosProfile";
import { InvoiceItem } from "models/baseModels/InvoiceItem/InvoiceItem";
import { SalesInvoice } from "models/baseModels/SalesInvoice/SalesInvoice";
import { SalesInvoiceItem } from "models/baseModels/SalesInvoiceItem/SalesInvoiceItem";
import { AppliedCouponCodes } from "models/baseModels/AppliedCouponCodes/AppliedCouponCodes";
import {
  validateSinv,
  getItemDiscounts,
  validateShipment,
  getTotalQuantity,
  getTotalTaxedAmount,
  validateIsPosSettingsSet,
} from "src/utils/pos";
import {
  validateQty,
  getItemQtyMap,
  getPricingRule,
  removeFreeItems,
  getItemRateFromPriceList,
  getItemVisibility,
  isLoyaltyProgramExpiredAndMaxed,
} from "models/helpers";
import {
  POSItem,
  ItemQtyMap,
  ItemSerialNumbers,
} from "src/components/POS/types";
import { ValidationError } from "fyo/utils/errors";
import { getExistingActiveSerialNumbersForItem } from "models/inventory/helpers";

const COMPONENT_NAME = "POS";

// State (data)
const tableView = ref(true);
const items = ref<POSItem[]>([]);

const openAlertModal = ref(false);
const openPaymentModal = ref(false);
const openKeyboardModal = ref(false);
const openPriceListModal = ref(false);
const openItemEnquiryModal = ref(false);
const openCouponCodeModal = ref(false);
const openShiftCloseModal = ref(false);
const openSavedInvoiceModal = ref(false);
const openLoyaltyProgramModal = ref(false);
const openAppliedCouponsModal = ref(false);
const openReturnSalesInvoiceModal = ref(false);
const openBatchSelectionModal = ref(false);

const totalQuantity = ref(0);
const paidAmount = ref<Money>(fyo.pesa(0));
const itemDiscounts = ref<Money>(fyo.pesa(0));
const transferAmount = ref<Money>(fyo.pesa(0));
const totalTaxedAmount = ref<Money>(fyo.pesa(0));

const loyaltyPoints = ref(0);
const appliedLoyaltyPoints = ref(0);
const loyaltyProgram = ref("");

const appliedCouponsCount = ref(0);

const itemSearchTerm = ref("");
const selectedItemGroup = ref("");
const paymentMethod = ref<string | undefined>(undefined);
const transferRefNo = ref<string | undefined>(undefined);
const defaultCustomer = ref<string | undefined>(undefined);
const transferClearanceDate = ref<Date | undefined>(undefined);

const paymentDoc = ref<Payment>({} as Payment);
const sinvDoc = ref<SalesInvoice>({} as SalesInvoice);
const posProfile = ref<POSProfile>({} as POSProfile);
const itemQtyMap = ref<ItemQtyMap>({} as ItemQtyMap);
const coupons = ref<AppliedCouponCodes>({} as AppliedCouponCodes);
const itemSerialNumbers = ref<ItemSerialNumbers>({} as ItemSerialNumbers);
const quickQtyActive = ref(false);
const quickQtyBuffer = ref("");
const quickQtyRow = ref<SalesInvoiceItem | null>(null);
const quickQtyKeyDownHandler = ref<((e: KeyboardEvent) => void) | null>(null);
const quickQtyKeyUpHandler = ref<((e: KeyboardEvent) => void) | null>(null);
const selectedItemForBatch = ref("");
const pendingBatchItem = ref<{ item: POSItem; quantity: number } | null>(null);
const expandedBatchId = ref<string | undefined>(undefined);
const itemVisibilityValue = ref<
  "Inventory Items" | "ERP Sync Items" | "Non-Inventory Items"
>("Inventory Items");

// Injections
const shortcuts = inject(shortcutsKey);

// Computed
const defaultPOSCashAccount = computed(
  () => fyo.singles.POSSettings?.cashAccount ?? undefined,
);
const isDiscountingEnabled = computed(
  () => !!fyo.singles.AccountingSettings?.enableDiscounting,
);
const isPosShiftOpen = computed(() => !!fyo.singles.POSSettings?.isShiftOpen);
const itemVisibility = computed(() => itemVisibilityValue.value);
const disablePayButton = computed(() => {
  if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
    return true;
  }
  return false;
});

// Provides
provide(
  "doc",
  computed(() => sinvDoc.value),
);
provide(
  "sinvDoc",
  computed(() => sinvDoc.value),
);
provide(
  "coupons",
  computed(() => coupons.value),
);
provide(
  "itemQtyMap",
  computed(() => itemQtyMap.value),
);
provide(
  "paidAmount",
  computed(() => paidAmount.value),
);
provide(
  "paymentMethod",
  computed(() => paymentMethod.value),
);
provide(
  "transferRefNo",
  computed(() => transferRefNo.value),
);
provide(
  "itemDiscounts",
  computed(() => itemDiscounts.value),
);
provide(
  "transferAmount",
  computed(() => transferAmount.value),
);
provide(
  "appliedCoupons",
  computed(() => sinvDoc.value.coupons),
);
provide(
  "totalTaxedAmount",
  computed(() => totalTaxedAmount.value),
);
provide(
  "itemSerialNumbers",
  computed(() => itemSerialNumbers.value),
);
provide(
  "isDiscountingEnabled",
  computed(() => isDiscountingEnabled.value),
);
provide(
  "transferClearanceDate",
  computed(() => transferClearanceDate.value),
);
provide(
  "posSettings",
  computed(() => fyo.singles.POSSettings),
);

// Watchers
watch(
  sinvDoc,
  () => {
    if (sinvDoc.value.coupons?.length) {
      setCouponsCount(sinvDoc.value.coupons.length);
    }
    updateValues();
  },
  { deep: true },
);

// Lifecycle
onMounted(async () => {
  await setItems();
  await loadPOSProfile();
  itemVisibilityValue.value = (await getItemVisibility(fyo)) as
    | "Inventory Items"
    | "ERP Sync Items"
    | "Non-Inventory Items";
});

onActivated(async () => {
  toggleSidebar(false);
  validateIsPosSettingsSet(fyo);
  setCouponCodeDoc();
  setSinvDoc();
  setDefaultCustomer();
  setShortcuts();
  addQuickQtyListeners();

  await setItemQtyMap();
  await setItems();
});

onDeactivated(() => {
  shortcuts?.delete(COMPONENT_NAME);
  toggleSidebar(true);
  removeQuickQtyListeners();
});

// Methods

function setQuickQtySelectedRow(row: SalesInvoiceItem) {
  quickQtyRow.value = row;
}

function setExpandedBatchId(rowName: string | undefined) {
  expandedBatchId.value = rowName;
}

function addQuickQtyListeners() {
  quickQtyKeyDownHandler.value = (e: KeyboardEvent) => onQuickQtyKeyDown(e);
  quickQtyKeyUpHandler.value = (e: KeyboardEvent) => onQuickQtyKeyUp(e);
  if (typeof window !== "undefined") {
    window.addEventListener(
      "keydown",
      quickQtyKeyDownHandler.value as EventListener,
    );
    window.addEventListener(
      "keyup",
      quickQtyKeyUpHandler.value as EventListener,
    );
  }
}

function removeQuickQtyListeners() {
  if (typeof window !== "undefined") {
    if (quickQtyKeyDownHandler.value) {
      window.removeEventListener(
        "keydown",
        quickQtyKeyDownHandler.value as EventListener,
      );
    }
    if (quickQtyKeyUpHandler.value) {
      window.removeEventListener(
        "keyup",
        quickQtyKeyUpHandler.value as EventListener,
      );
    }
  }
  quickQtyKeyDownHandler.value = null;
  quickQtyKeyUpHandler.value = null;
}

function hasAnyOpenModal(): boolean {
  return (
    openAlertModal.value ||
    openPaymentModal.value ||
    openKeyboardModal.value ||
    openPriceListModal.value ||
    openItemEnquiryModal.value ||
    openCouponCodeModal.value ||
    openShiftCloseModal.value ||
    openSavedInvoiceModal.value ||
    openLoyaltyProgramModal.value ||
    openAppliedCouponsModal.value ||
    openReturnSalesInvoiceModal.value
  );
}

function onQuickQtyKeyDown(e: KeyboardEvent) {
  const notMods = !(e.altKey || e.metaKey || e.ctrlKey);
  const target = e.target as HTMLElement | null;
  if (
    target &&
    notMods &&
    ((target instanceof HTMLInputElement && target.type !== "button") ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable)
  ) {
    return;
  }

  if (hasAnyOpenModal()) {
    return;
  }

  if (e.code === "KeyQ" && !quickQtyActive.value) {
    quickQtyActive.value = true;
    quickQtyBuffer.value = "";
    return;
  }

  if (!quickQtyActive.value) {
    return;
  }

  if (/^Digit[0-9]$/.test(e.code)) {
    quickQtyBuffer.value += e.code.replace("Digit", "");
    e.preventDefault();
    return;
  }

  if (/^Numpad[0-9]$/.test(e.code)) {
    quickQtyBuffer.value += e.code.replace("Numpad", "");
    e.preventDefault();
    return;
  }

  if (e.code === "Backspace") {
    quickQtyBuffer.value = quickQtyBuffer.value.slice(0, -1);
    e.preventDefault();
    return;
  }
}

async function onQuickQtyKeyUp(e: KeyboardEvent) {
  if (e.code !== "KeyQ" || !quickQtyActive.value) {
    return;
  }

  quickQtyActive.value = false;

  const buffer = quickQtyBuffer.value;
  quickQtyBuffer.value = "";

  if (!buffer || !buffer.length) {
    return;
  }

  const qty = Number(buffer);
  if (!Number.isFinite(qty)) {
    return;
  }

  let row = quickQtyRow.value as SalesInvoiceItem | null;
  if (!row || !(sinvDoc.value.items || []).includes(row)) {
    const items = (sinvDoc.value.items || []).filter((r) => !r.isFreeItem);
    row = items.length ? (items[items.length - 1] as SalesInvoiceItem) : null;
  }

  if (!row) {
    return;
  }

  const prevQty = row.quantity ?? 1;

  if (!row.isReturn && qty <= 0) {
    showToast({
      type: "error",
      message: t`Quantity must be greater than zero.`,
      duration: "short",
    });
    return;
  }

  try {
    await row.set("quantity", qty);

    const existingItems = (sinvDoc.value.items || []).filter(
      (invoiceItem) =>
        (invoiceItem as InvoiceItem).item === row!.item &&
        !(invoiceItem as InvoiceItem).isFreeItem,
    ) as InvoiceItem[];

    await validateQty(sinvDoc.value as SalesInvoice, row, existingItems);
  } catch (error) {
    await row.set("quantity", prevQty);
    showToast({
      type: "error",
      message: t`${error as string}`,
      duration: "short",
    });
    return;
  }

  if (!row.isFreeItem) {
    await applyPricingRule();
    await sinvDoc.value.runFormulas();
  }
}

async function setCustomer(value: string) {
  if (!value) {
    sinvDoc.value.party = "";
    return;
  }

  sinvDoc.value.party = value;

  const party = await fyo.db.getAll(ModelNameEnum.Party, {
    fields: ["loyaltyProgram", "loyaltyPoints"],
    filters: { name: value },
  });

  const loyaltyProgramName = party[0]?.loyaltyProgram as string;

  if (loyaltyProgramName) {
    const isExpiredAndMaxed = await isLoyaltyProgramExpiredAndMaxed(
      fyo,
      loyaltyProgramName,
    );
    if (isExpiredAndMaxed) {
      loyaltyProgram.value = loyaltyProgramName;
      loyaltyPoints.value = 0;
      return;
    }
  }

  loyaltyProgram.value = loyaltyProgramName;
  loyaltyPoints.value = party[0]?.loyaltyPoints as number;
}

async function loadPOSProfile() {
  const posProfileName = fyo.singles.POSSettings?.posProfile;

  if (!posProfileName) {
    return;
  }

  posProfile.value = (await fyo.doc.getDoc(
    ModelNameEnum.POSProfile,
    posProfileName as string,
  )) as POSProfile;
}

async function handleItemSearch(searchTerm: string, addItemState?: boolean) {
  itemSearchTerm.value = searchTerm;
  if (!addItemState) return;

  let quantity = 1;
  const posSettings = fyo.singles.POSSettings;
  const isWeightEnabledBarcode = posSettings?.weightEnabledBarcode;

  const checkDigits = posSettings?.checkDigits || "";
  const itemCodeDigits = posSettings?.itemCodeDigits || 0;
  const weightDigits = posSettings?.itemWeightDigits || 0;

  const expectedWeightBarcodeLength =
    String(checkDigits).length + Number(itemCodeDigits) + Number(weightDigits);

  let isWeightBarcode = false;
  let itemCode = searchTerm;
  let weightPart = "";

  if (
    isWeightEnabledBarcode &&
    searchTerm.length === expectedWeightBarcodeLength
  ) {
    const extractedItemCode = searchTerm.slice(
      checkDigits.toString().length,
      checkDigits.toString().length + itemCodeDigits,
    );
    const weightData = searchTerm.slice(
      checkDigits.toString().length + itemCodeDigits,
    );

    if (!isNaN(Number(weightData))) {
      isWeightBarcode = true;
      itemCode = extractedItemCode;
      weightPart = weightData;
    }
  }

  const allItems = await fyo.db.getAll(ModelNameEnum.Item, {
    fields: ["name", "barcode", "itemCode", "unit"],
  });

  let matchedItem = null;

  if (isWeightBarcode) {
    matchedItem = allItems.find(
      (item) => item.itemCode === itemCode || item.barcode === itemCode,
    );
  } else if (searchTerm.length === 12) {
    matchedItem = allItems.find((item) => item.barcode === searchTerm);
  }

  if (!matchedItem) {
    matchedItem = allItems.find((item) => item.name === searchTerm);
  }

  if (!matchedItem) return;

  if (isWeightBarcode && weightPart) {
    const weightValue = parseInt(weightPart, 10);
    if ((matchedItem.unit as string)?.toLowerCase() === "kg") {
      quantity = weightValue / 1000;
    } else {
      quantity = weightValue;
    }
  }

  const itemDoc = getItem(matchedItem.name as string);
  if (itemDoc && addItemState) {
    await addItem(itemDoc as POSItem, quantity);
    itemSearchTerm.value = "";
  }
}

function getItem(name: string) {
  return items.value.find((item) => item.name === name);
}

function isModalOpen() {
  for (const modal of modalNames) {
    if (modal) {
      // Re-map evaluation safe-check to avoid eval usage.
      const modalsMap: Record<string, any> = {
        ShiftClose: openShiftCloseModal,
        LoyaltyProgram: openLoyaltyProgramModal,
        BatchSelection: openBatchSelectionModal,
        SavedInvoice: openSavedInvoiceModal,
        CouponCode: openCouponCodeModal,
        PriceList: openPriceListModal,
        ItemEnquiry: openItemEnquiryModal,
        Payment: openPaymentModal,
        ReturnSalesInvoice: openReturnSalesInvoiceModal,
        Alert: openAlertModal,
        Keyboard: openKeyboardModal,
      };

      const modalRef = modalsMap[modal];
      if (modalRef && modalRef.value) {
        modalRef.value = false;
        return `open${modal}Modal`;
      }
    }
  }
}

function setShortcuts() {
  shortcuts?.shift.set(COMPONENT_NAME, ["KeyS"], async () => {
    await routeToSinvList();
  });

  shortcuts?.shift.set(COMPONENT_NAME, ["KeyV"], () => {
    toggleView();
  });

  shortcuts?.shift.set(COMPONENT_NAME, ["KeyP"], () => {
    toggleModal("PriceList");
  });

  shortcuts?.pmodShift.set(COMPONENT_NAME, ["KeyH"], () => {
    toggleModal("SavedInvoice");
  });

  shortcuts?.pmodShift.set(COMPONENT_NAME, ["Backspace"], async () => {
    const modalStatus = isModalOpen();

    if (!modalStatus) {
      await clearValues();
    }
  });

  shortcuts?.pmodShift.set(COMPONENT_NAME, ["KeyP"], () => {
    if (!disablePayButton.value) {
      toggleModal("Payment");
    }
  });

  shortcuts?.pmodShift.set(COMPONENT_NAME, ["KeyS"], async () => {
    const modalStatus = isModalOpen();

    if (!modalStatus && sinvDoc.value.party && sinvDoc.value.items?.length) {
      await saveOrder();
    }
  });

  shortcuts?.shift.set(COMPONENT_NAME, ["KeyL"], () => {
    if (
      fyo.singles.AccountingSettings?.enablePriceList &&
      loyaltyPoints.value &&
      sinvDoc.value.party &&
      sinvDoc.value.items?.length &&
      loyaltyProgram.value
    ) {
      toggleModal("LoyaltyProgram", true);
    }
  });

  shortcuts?.shift.set(COMPONENT_NAME, ["KeyC"], () => {
    if (
      fyo.singles.AccountingSettings?.enableCouponCode &&
      sinvDoc.value?.party &&
      sinvDoc.value?.items?.length
    ) {
      toggleModal("CouponCode");
    }
  });
}

async function saveOrder() {
  try {
    await validate();
    await sinvDoc.value.runFormulas();
    await sinvDoc.value.sync();
  } catch (error) {
    return showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }

  showToast({
    type: "success",
    message: t`Sales Invoice ${sinvDoc.value.name as string} is Saved`,
    duration: "short",
  });

  await afterSync();
}

async function setItemGroup(itemGroupName: string) {
  selectedItemGroup.value = itemGroupName;
  await setItems();
}

async function setItems() {
  const filters: Record<string, boolean | string> = {};
  const visibility = await getItemVisibility(fyo);

  const hideUnavailable =
    posProfile.value?.hideUnavailableItems ??
    fyo.singles.POSSettings?.hideUnavailableItems;

  if (visibility === "Inventory Items") {
    filters.trackItem = true;
  } else if (visibility === "ERP Sync Items") {
    filters.datafromErp = true;
  } else if (visibility === "Non-Inventory Items") {
    filters.trackItem = false;
    filters.datafromErp = false;
  }

  if (selectedItemGroup.value) {
    filters.itemGroup = selectedItemGroup.value;
  }

  const itemsDocs = (await fyo.db.getAll(ModelNameEnum.Item, {
    fields: [],
    filters: filters,
  })) as Item[];

  items.value = [];
  for (const item of itemsDocs) {
    let availableQty = 0;

    if (itemQtyMap.value[item.name as string]) {
      availableQty = itemQtyMap.value[item.name as string].availableQty;
    }

    if (!item.name) {
      continue;
    }
    if (hideUnavailable && filters.trackItem && availableQty <= 0) {
      continue;
    }

    items.value.push({
      availableQty,
      name: item.name,
      image: item?.image as string,
      rate: item.rate as Money,
      unit: item.unit as string,
      hasBatch: !!item.hasBatch,
      hasSerialNumber: !!item.hasSerialNumber,
    });
  }
}

async function selectedReturnInvoice(invoiceName: string) {
  const salesInvoiceDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    invoiceName,
  )) as SalesInvoice;

  let returnDoc = (await salesInvoiceDoc.getReturnDoc()) as SalesInvoice;

  if (!returnDoc || !returnDoc.name) {
    return;
  }

  sinvDoc.value = returnDoc;
}

function toggleView() {
  tableView.value = !tableView.value;
}

function setPaidAmount(amount: Money) {
  paidAmount.value = fyo.pesa(amount.toString());
}

function setPaymentMethod(method: string) {
  paymentMethod.value = method;
}

function setDefaultCustomer() {
  defaultCustomer.value =
    posProfile.value?.posCustomer ?? fyo.singles.Defaults?.posCustomer ?? "";
  sinvDoc.value.party = defaultCustomer.value;
}

function setItemDiscounts() {
  itemDiscounts.value = getItemDiscounts(
    sinvDoc.value.items as SalesInvoiceItem[],
  );
}

async function setItemQtyMap() {
  itemQtyMap.value = await getItemQtyMap(sinvDoc.value as SalesInvoice);
}

function setSinvDoc() {
  sinvDoc.value = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: fyo.singles.POSSettings?.defaultAccount,
    party: sinvDoc.value.party ?? defaultCustomer.value,
    isPOS: true,
  }) as SalesInvoice;
}

function setCouponCodeDoc() {
  coupons.value = fyo.doc.getNewDoc(
    ModelNameEnum.AppliedCouponCodes,
  ) as AppliedCouponCodes;
}

function setTotalQuantity() {
  totalQuantity.value = getTotalQuantity(
    sinvDoc.value.items as SalesInvoiceItem[],
  );
}

function ignorePricingRules(): boolean {
  if (posProfile.value && posProfile.value.name) {
    return posProfile.value.ignorePricingRule as boolean;
  }
  return !!fyo.singles.POSSettings?.ignorePricingRule;
}

function setTotalTaxedAmount() {
  totalTaxedAmount.value = getTotalTaxedAmount(sinvDoc.value as SalesInvoice);
}

function setCouponsCount(value: number) {
  appliedCouponsCount.value = value;
}

async function setLoyaltyPoints(value: number) {
  appliedLoyaltyPoints.value = value;
  await sinvDoc.value.set("redeemLoyaltyPoints", true);
  await sinvDoc.value.runFormulas();
}

async function selectedInvoiceName(doc: SalesInvoice) {
  const salesInvoiceDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    doc.name,
  )) as SalesInvoice;

  sinvDoc.value = salesInvoiceDoc;
  toggleModal("SavedInvoice", false);

  if (doc.submitted) {
    toggleModal("Payment");
  }
}

function setTransferAmount(amount: Money = fyo.pesa(0)) {
  transferAmount.value = amount;
}

function setTransferClearanceDate(date: Date) {
  transferClearanceDate.value = date;
}

function setTransferRefNo(ref: string) {
  transferRefNo.value = ref;
}

function validateInvoice() {
  if (sinvDoc.value.isSubmitted) {
    throw new ValidationError(t`Cannot add an item to a submitted invoice.`);
  }

  if (sinvDoc.value.returnAgainst) {
    throw new ValidationError(t`Unable to add an item to the return invoice.`);
  }
}

async function addItem(item: POSItem | undefined, quantity?: number) {
  try {
    await sinvDoc.value.runFormulas();
    validateInvoice();

    if (!item) {
      return;
    }

    const itemName = item.name;

    if (item.hasBatch) {
      selectedItemForBatch.value = itemName;
      pendingBatchItem.value = { item, quantity: quantity ?? 1 };

      toggleModal("BatchSelection", true);
      return;
    }

    const isInventoryItem = await fyo.getValue(
      ModelNameEnum.Item,
      itemName,
      "trackItem",
    );

    if (isInventoryItem) {
      const availableQty = itemQtyMap.value[itemName]?.availableQty ?? 0;
      if (availableQty <= 0) {
        throw new ValidationError(
          t`Item ${itemName} is out of stock (quantity is zero)`,
        );
      }
    }

    const existingItems =
      sinvDoc.value.items?.filter(
        (invoiceItem) =>
          invoiceItem.item === itemName && !invoiceItem.isFreeItem,
      ) ?? [];

    await validateQty(
      sinvDoc.value as SalesInvoice,
      item,
      existingItems as InvoiceItem[],
    );

    const itemsHsncode = (await fyo.getValue(
      "Item",
      itemName,
      "hsnCode",
    )) as number;

    if (item.hasBatch) {
      const addQty = quantity ?? 1;

      if (existingItems.length > 0) {
        for (let existingItem of existingItems) {
          const availableQty = await fyo.db.getStockQuantity(
            existingItem.item as string,
            undefined,
            undefined,
            undefined,
            existingItem.batch,
          );
          if (
            existingItem.batch != null &&
            availableQty != null &&
            availableQty > (existingItem.quantity as number)
          ) {
            const currentQty = existingItem.quantity ?? 0;
            await existingItem.set("quantity", currentQty + addQty);

            if (item.hasSerialNumber) {
              const qty = currentQty + addQty;

              const serialNumbers = await getExistingActiveSerialNumbersForItem(
                fyo,
                itemName,
                qty,
              );

              if (serialNumbers) {
                itemSerialNumbers.value[itemName] = serialNumbers;
                await existingItem.set("serialNumber", serialNumbers);
              }
            }

            await applyPricingRule();
            await sinvDoc.value.runFormulas();
            return;
          }
        }
      }

      await sinvDoc.value.append("items", {
        rate: item.rate,
        item: itemName,
        quantity: addQty,
        hsnCode: itemsHsncode,
      });

      if (item.hasSerialNumber) {
        const serialNumbers = await getExistingActiveSerialNumbersForItem(
          fyo,
          itemName,
          addQty,
        );

        if (serialNumbers) {
          itemSerialNumbers.value[itemName] = serialNumbers;

          const newItemRows = sinvDoc.value.items?.filter(
            (row) => row.item === itemName && !row.isFreeItem,
          );

          if (newItemRows && newItemRows.length > 0) {
            const newRow = newItemRows[newItemRows.length - 1];
            await newRow.set("serialNumber", serialNumbers);
          }
        }
      }

      await applyPricingRule();
      await sinvDoc.value.runFormulas();
      return;
    }

    if (existingItems.length) {
      if (!sinvDoc.value.priceList) {
        existingItems[0].rate = item.rate;
      }

      const currentQty = existingItems[0].quantity ?? 0;
      const addQty = quantity ?? 1;
      if (isInventoryItem) {
        const availableQty = itemQtyMap.value[itemName]?.availableQty ?? 0;
        if (currentQty + addQty > availableQty) {
          throw new ValidationError(
            `Cannot add more than the available quantity for ${itemName}`,
          );
        }
      }

      await existingItems[0].set("quantity", currentQty + addQty);
      if (item.hasSerialNumber) {
        const qty = currentQty + addQty;

        const serialNumbers = await getExistingActiveSerialNumbersForItem(
          fyo,
          itemName,
          qty,
        );

        if (serialNumbers) {
          itemSerialNumbers.value[itemName] = serialNumbers;
          await existingItems[0].set("serialNumber", serialNumbers);
        }
      }

      await applyPricingRule();
      await sinvDoc.value.runFormulas();
      if (isInventoryItem) {
        await validateQty(
          sinvDoc.value as SalesInvoice,
          item,
          existingItems as InvoiceItem[],
        );
      }
      return;
    }

    await sinvDoc.value.append("items", {
      rate: item.rate,
      item: itemName,
      quantity: quantity ? quantity : 1,
      hsnCode: itemsHsncode,
    });

    if (sinvDoc.value.priceList) {
      const itemData = sinvDoc.value.items?.filter(
        (val) => val.item == itemName,
      ) as SalesInvoiceItem[];

      if (itemData.length > 0) {
        itemData[0].rate = await getItemRateFromPriceList(
          itemData[0],
          sinvDoc.value.priceList,
        );
      }
    }

    if (item.hasSerialNumber) {
      const qty = quantity ?? 1;

      const serialNumbers = await getExistingActiveSerialNumbersForItem(
        fyo,
        itemName,
        qty,
      );

      if (serialNumbers) {
        itemSerialNumbers.value[itemName] = serialNumbers;

        const newItemRows = sinvDoc.value.items?.filter(
          (row) => row.item === itemName && !row.isFreeItem,
        );

        if (newItemRows && newItemRows.length > 0) {
          const newRow = newItemRows[newItemRows.length - 1];
          await newRow.set("serialNumber", serialNumbers);
        }
      }
    }

    await applyPricingRule();
    await sinvDoc.value.runFormulas();
  } catch (error) {
    return showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function handleBatchSelected(batchName: string) {
  if (!pendingBatchItem.value) {
    return;
  }

  const { item, quantity } = pendingBatchItem.value;
  pendingBatchItem.value = null;

  try {
    const itemDoc = (await fyo.doc.getDoc(
      ModelNameEnum.Item,
      item.name,
    )) as Item;
    let availableQty = 0;
    if (itemDoc.trackItem) {
      availableQty =
        (await fyo.db.getStockQuantity(
          item.name,
          undefined,
          undefined,
          undefined,
          batchName,
        )) ?? 0;

      const itemIndex = items.value.findIndex((i) => i.name === item.name);
      if (itemIndex !== -1) {
        items.value[itemIndex].availableQty = availableQty ?? 0;
      }
    }

    const existingItems =
      sinvDoc.value.items?.filter(
        (invoiceItem) =>
          invoiceItem.item === item.name &&
          invoiceItem.batch === batchName &&
          !invoiceItem.isFreeItem,
      ) ?? [];

    await validateQty(
      sinvDoc.value as SalesInvoice,
      itemDoc,
      existingItems as InvoiceItem[],
    );

    if (existingItems.length) {
      const currentQty = existingItems[0].quantity ?? 0;
      const addQty = quantity ?? 1;
      await existingItems[0].set("quantity", currentQty + addQty);
    } else {
      await sinvDoc.value.append("items", {
        rate: item.rate as Money,
        item: item.name,
        quantity: quantity ?? 1,
        hsnCode: itemDoc.hsnCode,
        batch: batchName,
      });
    }

    await applyPricingRule();
    await sinvDoc.value.runFormulas();

    await setItemQtyMap();
  } catch (error) {
    showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function createTransaction(shouldPrint = false, isPay = false) {
  try {
    sinvDoc.value.date = new Date();
    await validate();
    await submitSinvDoc();

    const visibility = await getItemVisibility(fyo);

    if (sinvDoc.value.stockNotTransferred && visibility === "Inventory Items") {
      await makeStockTransfer();
    }

    if (isPay) {
      await makePayment(shouldPrint);
    }

    if (shouldPrint) {
      await routeTo(`/print/${sinvDoc.value.schemaName}/${sinvDoc.value.name}`);
    }

    await afterTransaction();
    await setItems();
  } catch (error) {
    showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function makePayment(shouldPrint: boolean) {
  paymentDoc.value = sinvDoc.value.getPayment() as Payment;
  if (!paymentDoc.value) {
    return null;
  }

  const pMethod = paymentMethod.value;

  await paymentDoc.value.set("paymentMethod", pMethod);
  await paymentDoc.value.set("amount", fyo.pesa(paidAmount.value.float));
  await paymentDoc.value.set("referenceType", ModelNameEnum.SalesInvoice);

  const paymentMethodDoc =
    await paymentDoc.value.loadAndGetLink("paymentMethod");

  if (paymentMethodDoc?.type !== "Cash") {
    await paymentDoc.value.setMultiple({
      referenceId: transferRefNo.value,
      clearanceDate: transferClearanceDate.value,
    });
  }

  if (paymentMethodDoc?.type === "Cash") {
    await paymentDoc.value.setMultiple({
      paymentAccount: defaultPOSCashAccount.value,
    });
  }

  paymentDoc.value.once("afterSubmit", () => {
    showToast({
      type: "success",
      message: t`Payment ${paymentDoc.value.name as string} is Saved`,
      duration: "short",
    });
  });

  try {
    await paymentDoc.value?.sync();
    await paymentDoc.value?.submit();

    if (shouldPrint) {
      await routeTo(`/print/${sinvDoc.value.schemaName}/${sinvDoc.value.name}`);
    }
  } catch (error) {
    return showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function makeStockTransfer() {
  const shipmentDoc = (await sinvDoc.value.getStockTransfer()) as Shipment;
  if (!shipmentDoc.items) {
    return;
  }

  for (const item of shipmentDoc.items) {
    const trackItem = await fyo.getValue(
      ModelNameEnum.Item,
      item.item as string,
      "trackItem",
    );

    if (!trackItem) {
      continue;
    }

    if (posProfile.value && posProfile.value.name) {
      item.location = posProfile.value.inventory;
    } else {
      item.location = fyo.singles.POSSettings?.inventory;
    }

    item.serialNumber =
      itemSerialNumbers.value[item.item as string] ?? undefined;
  }

  shipmentDoc.once("afterSubmit", () => {
    showToast({
      type: "success",
      message: t`Shipment ${shipmentDoc.name as string} is Submitted`,
      duration: "short",
    });
  });

  try {
    await shipmentDoc.sync();
    await shipmentDoc.submit();
  } catch (error) {
    return showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function submitSinvDoc() {
  sinvDoc.value.once("afterSubmit", () => {
    showToast({
      type: "success",
      message: t`Sales Invoice ${sinvDoc.value.name as string} is Submitted`,
      duration: "short",
    });
  });

  try {
    await validate();
    await sinvDoc.value.runFormulas();
    await sinvDoc.value.sync();
    await sinvDoc.value.submit();
  } catch (error) {
    return showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

async function afterSync() {
  await clearValues();
  setSinvDoc();
}

async function afterTransaction() {
  await setItemQtyMap();
  if (sinvDoc.value.isSubmitted) {
    await clearValues();
    setSinvDoc();
  }
  toggleModal("Payment", false);
}

async function clearValues() {
  setSinvDoc();
  itemSerialNumbers.value = {};

  paidAmount.value = fyo.pesa(0);
  transferAmount.value = fyo.pesa(0);
  await setItems();

  if (!defaultCustomer.value) {
    sinvDoc.value.party = "";
  }
}

function toggleModal(modal: ModalName, value?: boolean) {
  const modalMap: Record<string, any> = {
    ShiftClose: openShiftCloseModal,
    LoyaltyProgram: openLoyaltyProgramModal,
    BatchSelection: openBatchSelectionModal,
    SavedInvoice: openSavedInvoiceModal,
    CouponCode: openCouponCodeModal,
    PriceList: openPriceListModal,
    ItemEnquiry: openItemEnquiryModal,
    Payment: openPaymentModal,
    ReturnSalesInvoice: openReturnSalesInvoiceModal,
    Alert: openAlertModal,
    Keyboard: openKeyboardModal,
  };

  const modalRef = modalMap[modal];
  if (modalRef) {
    if (value !== undefined) {
      modalRef.value = value;
    } else {
      modalRef.value = !modalRef.value;
    }
  }
}

function updateValues() {
  setTotalQuantity();
  setItemDiscounts();
  setTotalTaxedAmount();
}

async function validate() {
  await validateSinv(sinvDoc.value as SalesInvoice, itemQtyMap.value);

  if (!sinvDoc.value.isReturn) {
    await validateShipment(itemSerialNumbers.value);
  }
}

async function applyPricingRule() {
  if (ignorePricingRules()) {
    return;
  }
  const hasPricingRules = await getPricingRule(sinvDoc.value as SalesInvoice);

  if (!hasPricingRules || !hasPricingRules.length) {
    sinvDoc.value.pricingRuleDetail = undefined;
    sinvDoc.value.isPricingRuleApplied = false;

    removeFreeItems(sinvDoc.value as SalesInvoice);
    await sinvDoc.value.applyProductDiscount();

    return;
  }

  await sinvDoc.value.appendPricingRuleDetail(hasPricingRules);
  await sinvDoc.value.applyProductDiscount();

  const outOfStockFreeItems: string[] = [];
  const map = await getItemQtyMap(sinvDoc.value as SalesInvoice);

  hasPricingRules.map((pRule) => {
    const freeItemQty = map[pRule.pricingRule.freeItem as string]?.availableQty;

    if (freeItemQty <= 0) {
      sinvDoc.value.items = sinvDoc.value.items?.filter(
        (val) => !(val.isFreeItem && val.item == pRule.pricingRule.freeItem),
      );

      outOfStockFreeItems.push(pRule.pricingRule.freeItem as string);
    }
  });

  if (!outOfStockFreeItems.length) {
    return;
  }

  showToast({
    type: "error",
    message: t`Free items out of stock: ${outOfStockFreeItems.join(", ")}`,
  });
}

async function routeToSinvList() {
  if (!sinvDoc.value.items?.length) {
    return await routeTo("/list/SalesInvoice");
  }

  openAlertModal.value = true;
}

async function handleSaveAndContinue() {
  try {
    if (!sinvDoc.value.party) {
      return showToast({
        type: "error",
        message: t`Please add a customer before saving`,
      });
    }
    await saveInvoiceAction();
    toggleModal("Alert", false);
    await routeTo("/list/SalesInvoice");
  } catch (error) {
    showToast({
      type: "error",
      message: t`${error as string}`,
    });
  }
}

function showValidationToast(method: string) {
  showToast({
    type: "error",
    message: t`${
      !sinvDoc.value.items?.length
        ? "Please add items"
        : "Please select a customer"
    } before ${method}`,
  });
}

async function saveInvoiceAction() {
  if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
    showValidationToast("saving");
    return;
  }
  await saveOrder();
}

function handlePaymentAction() {
  if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
    showValidationToast("payment");
    return;
  }

  toggleModal("Payment", true);
}

const formatCurrency = (val: any) => {
  return fyo.format(val, "Currency");
};

const nativeChangeQty = async (invoiceItem: any, delta: number) => {
  const newQty = (invoiceItem.quantity ?? 1) + delta;
  if (newQty <= 0) {
    sinvDoc.value.items = sinvDoc.value.items?.filter(
      (row) => row !== invoiceItem,
    );
  } else {
    await invoiceItem.set("quantity", newQty);
  }
  await applyPricingRule();
  await sinvDoc.value.runFormulas();
};
</script>
