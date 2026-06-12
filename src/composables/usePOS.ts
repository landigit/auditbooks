import { ref, computed, watch, onMounted, onActivated, onDeactivated, inject } from 'vue';
import { Money } from 'pesa';
import { fyo } from 'src/initFyo';
import { ModelNameEnum } from 'models/types';
import { showToast } from 'src/utils/interactive';
import { Item } from 'models/baseModels/Item/Item';
import { Shipment } from 'models/inventory/Shipment';
import { routeTo, toggleSidebar } from 'src/utils/ui';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { Payment } from 'models/baseModels/Payment/Payment';
import { ModalName, modalNames } from 'src/components/POS/types';
import { POSProfile } from 'models/baseModels/POSProfile/PosProfile';
import { InvoiceItem } from 'models/baseModels/InvoiceItem/InvoiceItem';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { SalesInvoiceItem } from 'models/baseModels/SalesInvoiceItem/SalesInvoiceItem';
import { AppliedCouponCodes } from 'models/baseModels/AppliedCouponCodes/AppliedCouponCodes';
import {
  validateSinv,
  getItemDiscounts,
  validateShipment,
  getTotalQuantity,
  getTotalTaxedAmount,
  validateIsPosSettingsSet,
} from 'src/utils/pos';
import {
  validateQty,
  getItemQtyMap,
  getPricingRule,
  removeFreeItems,
  getItemRateFromPriceList,
  getItemVisibility,
  isLoyaltyProgramExpiredAndMaxed,
} from 'models/helpers';
import { ItemVisibility, POSItem, ItemQtyMap, ItemSerialNumbers } from 'src/components/POS/types';
import { ValidationError } from 'fyo/utils/errors';
import { getExistingActiveSerialNumbersForItem } from 'models/inventory/helpers';

const COMPONENT_NAME = 'POS';

export function usePOS() {
  const shortcuts = inject(shortcutsKey);

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
  const additionalDiscounts = ref<Money>(fyo.pesa(0));

  const loyaltyPoints = ref(0);
  const appliedLoyaltyPoints = ref(0);
  const loyaltyProgram = ref('');

  const appliedCouponsCount = ref(0);
  const appliedCoupons = ref<AppliedCouponCodes[]>([]);

  const itemSearchTerm = ref('');
  const selectedItemGroup = ref('');
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
  const quickQtyBuffer = ref('');
  const quickQtyRow = ref<SalesInvoiceItem | null>(null);
  const quickQtyKeyDownHandler = ref<((e: KeyboardEvent) => void) | null>(null);
  const quickQtyKeyUpHandler = ref<((e: KeyboardEvent) => void) | null>(null);

  const selectedItemForBatch = ref('');
  const pendingBatchItem = ref<{ item: POSItem; quantity: number } | null>(null);
  const expandedBatchId = ref<string | null | undefined>(undefined);
  const itemVisibilityValue = ref<ItemVisibility>('Inventory Items');

  const defaultPOSCashAccount = computed(() => fyo.singles.POSSettings?.cashAccount ?? undefined);
  const isDiscountingEnabled = computed(() => !!fyo.singles.AccountingSettings?.enableDiscounting);
  const isPosShiftOpen = computed(() => !!fyo.singles.POSSettings?.isShiftOpen);
  const itemVisibility = computed(() => itemVisibilityValue.value);

  const disablePayButton = computed(() => {
    if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
      return true;
    }
    return false;
  });

  watch(sinvDoc, () => {
    if (sinvDoc.value.coupons?.length) {
      setCouponsCount(sinvDoc.value.coupons.length);
    }
    updateValues();
  }, { deep: true });

  onMounted(async () => {
    await setItems();
    await loadPOSProfile();
    itemVisibilityValue.value = await getItemVisibility(fyo);
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

  function setQuickQtySelectedRow(row: SalesInvoiceItem) {
    quickQtyRow.value = row;
  }

  function setExpandedBatchId(rowName: string | null) {
    expandedBatchId.value = rowName;
  }

  function addQuickQtyListeners() {
    quickQtyKeyDownHandler.value = (e: KeyboardEvent) => onQuickQtyKeyDown(e);
    quickQtyKeyUpHandler.value = (e: KeyboardEvent) => onQuickQtyKeyUp(e);
    window.addEventListener('keydown', quickQtyKeyDownHandler.value as EventListener);
    window.addEventListener('keyup', quickQtyKeyUpHandler.value as EventListener);
  }

  function removeQuickQtyListeners() {
    if (quickQtyKeyDownHandler.value) {
      window.removeEventListener('keydown', quickQtyKeyDownHandler.value as EventListener);
      quickQtyKeyDownHandler.value = null;
    }
    if (quickQtyKeyUpHandler.value) {
      window.removeEventListener('keyup', quickQtyKeyUpHandler.value as EventListener);
      quickQtyKeyUpHandler.value = null;
    }
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
      ((target instanceof HTMLInputElement && target.type !== 'button') ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable)
    ) {
      return;
    }

    if (hasAnyOpenModal()) {
      return;
    }

    if (e.code === 'KeyQ' && !quickQtyActive.value) {
      quickQtyActive.value = true;
      quickQtyBuffer.value = '';
      return;
    }

    if (!quickQtyActive.value) {
      return;
    }

    if (/^Digit[0-9]$/.test(e.code)) {
      quickQtyBuffer.value += e.code.replace('Digit', '');
      e.preventDefault();
      return;
    }

    if (/^Numpad[0-9]$/.test(e.code)) {
      quickQtyBuffer.value += e.code.replace('Numpad', '');
      e.preventDefault();
      return;
    }

    if (e.code === 'Backspace') {
      quickQtyBuffer.value = quickQtyBuffer.value.slice(0, -1);
      e.preventDefault();
      return;
    }
  }

  async function onQuickQtyKeyUp(e: KeyboardEvent) {
    if (e.code !== 'KeyQ' || !quickQtyActive.value) {
      return;
    }

    quickQtyActive.value = false;
    const buffer = quickQtyBuffer.value;
    quickQtyBuffer.value = '';

    if (!buffer || !buffer.length) {
      return;
    }

    const qty = Number(buffer);
    if (!Number.isFinite(qty)) {
      return;
    }

    let row = quickQtyRow.value;
    if (!row || !(sinvDoc.value.items || []).includes(row)) {
      const activeItems = (sinvDoc.value.items || []).filter((r) => !r.isFreeItem);
      row = activeItems.length
        ? (activeItems[activeItems.length - 1] as SalesInvoiceItem)
        : null;
    }

    if (!row) {
      return;
    }

    const prevQty = row.quantity ?? 1;

    if (!row.isReturn && qty <= 0) {
      showToast({
        type: 'error',
        message: fyo.t`Quantity must be greater than zero.`,
        duration: 'short',
      });
      return;
    }

    try {
      await row.set('quantity', qty);

      const existingItems = (sinvDoc.value.items || []).filter(
        (invoiceItem) =>
          (invoiceItem as InvoiceItem).item === row!.item &&
          !(invoiceItem as InvoiceItem).isFreeItem
      ) as InvoiceItem[];

      await validateQty(
        sinvDoc.value as SalesInvoice,
        row as any,
        existingItems
      );
    } catch (error) {
      await row.set('quantity', prevQty);
      showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
        duration: 'short',
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
      sinvDoc.value.party = '';
      return;
    }

    sinvDoc.value.party = value;

    const party = await fyo.db.getAll(ModelNameEnum.Party, {
      fields: ['loyaltyProgram', 'loyaltyPoints'],
      filters: { name: value },
    });

    const loyaltyProgramName = party[0]?.loyaltyProgram as string;

    if (loyaltyProgramName) {
      const isExpiredAndMaxed = await isLoyaltyProgramExpiredAndMaxed(
        fyo,
        loyaltyProgramName
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
      posProfileName as string
    )) as POSProfile;
  }

  async function handleItemSearch(searchTerm: string, addItemFlag?: boolean) {
    itemSearchTerm.value = searchTerm;
    if (!addItemFlag) return;

    let quantity = 1;
    const posSettings = fyo.singles.POSSettings;
    const isWeightEnabledBarcode = posSettings?.weightEnabledBarcode;

    const checkDigits = posSettings?.checkDigits || '';
    const itemCodeDigits = posSettings?.itemCodeDigits || 0;
    const weightDigits = posSettings?.itemWeightDigits || 0;

    const expectedWeightBarcodeLength =
      String(checkDigits).length +
      Number(itemCodeDigits) +
      Number(weightDigits);

    let isWeightBarcode = false;
    let itemCode = searchTerm;
    let weightPart = '';

    if (
      isWeightEnabledBarcode &&
      searchTerm.length === expectedWeightBarcodeLength
    ) {
      const extractedItemCode = searchTerm.slice(
        checkDigits.toString().length,
        checkDigits.toString().length + itemCodeDigits
      );
      const weightData = searchTerm.slice(
        checkDigits.toString().length + itemCodeDigits
      );

      if (!isNaN(Number(weightData))) {
        isWeightBarcode = true;
        itemCode = extractedItemCode;
        weightPart = weightData;
      }
    }

    const allItems = await fyo.db.getAll(ModelNameEnum.Item, {
      fields: ['name', 'barcode', 'itemCode', 'unit'],
    });

    let matchedItem = null;

    if (isWeightBarcode) {
      matchedItem = allItems.find(
        (item) => item.itemCode === itemCode || item.barcode === itemCode
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
      if ((matchedItem.unit as string)?.toLowerCase() === 'kg') {
        quantity = weightValue / 1000;
      } else {
        quantity = weightValue;
      }
    }

    const itemDoc = getItem(matchedItem.name as string);
    if (itemDoc && addItemFlag) {
      await addItem(itemDoc as POSItem, quantity);
      itemSearchTerm.value = '';
    }
  }

  function getItem(name: string) {
    return items.value.find((item) => item.name === name);
  }

  function isModalOpen() {
    for (const modal of modalNames) {
      if (modal) {
        const key = `open${modal}Modal` as keyof typeof openAlertModal;
        // @ts-ignore
        if (this?.[key]) {
          // @ts-ignore
          this[key] = false;
          return key;
        }
      }
    }
  }

  function setShortcuts() {
    shortcuts?.shift.set(COMPONENT_NAME, ['KeyS'], async () => {
      await routeToSinvList();
    });

    shortcuts?.shift.set(COMPONENT_NAME, ['KeyV'], () => {
      toggleView();
    });

    shortcuts?.shift.set(COMPONENT_NAME, ['KeyP'], () => {
      toggleModal('PriceList');
    });

    shortcuts?.pmodShift.set(COMPONENT_NAME, ['KeyH'], () => {
      toggleModal('SavedInvoice');
    });

    shortcuts?.pmodShift.set(COMPONENT_NAME, ['Backspace'], async () => {
      const modalStatus = isModalOpen();
      if (!modalStatus) {
        await clearValues();
      }
    });

    shortcuts?.pmodShift.set(COMPONENT_NAME, ['KeyP'], () => {
      if (!disablePayButton.value) {
        toggleModal('Payment');
      }
    });

    shortcuts?.pmodShift.set(COMPONENT_NAME, ['KeyS'], async () => {
      const modalStatus = isModalOpen();
      if (!modalStatus && sinvDoc.value.party && sinvDoc.value.items?.length) {
        await saveOrder();
      }
    });

    shortcuts?.shift.set(COMPONENT_NAME, ['KeyL'], () => {
      if (
        fyo.singles.AccountingSettings?.enablePriceList &&
        loyaltyPoints.value &&
        sinvDoc.value.party &&
        sinvDoc.value.items?.length &&
        loyaltyProgram.value
      ) {
        toggleModal('LoyaltyProgram', true);
      }
    });

    shortcuts?.shift.set(COMPONENT_NAME, ['KeyC'], () => {
      if (
        fyo.singles.AccountingSettings?.enableCouponCode &&
        sinvDoc.value?.party &&
        sinvDoc.value?.items?.length
      ) {
        toggleModal('CouponCode');
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
        type: 'error',
        message: fyo.t`${error as string}`,
      });
    }

    showToast({
      type: 'success',
      message: fyo.t`Sales Invoice ${sinvDoc.value.name as string} is Saved`,
      duration: 'short',
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

    if (visibility === 'Inventory Items') {
      filters.trackItem = true;
    } else if (visibility === 'ERP Sync Items') {
      filters.datafromErp = true;
    } else if (visibility === 'Non-Inventory Items') {
      filters.trackItem = false;
      filters.datafromErp = false;
    }

    if (selectedItemGroup.value) {
      filters.itemGroup = selectedItemGroup.value;
    }

    const allItems = (await fyo.db.getAll(ModelNameEnum.Item, {
      fields: [],
      filters: filters,
    })) as Item[];

    const list: POSItem[] = [];
    for (const item of allItems) {
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

      list.push({
        availableQty,
        name: item.name,
        image: item?.image as string,
        rate: item.rate as Money,
        unit: item.unit as string,
        hasBatch: !!item.hasBatch,
        hasSerialNumber: !!item.hasSerialNumber,
      });
    }
    items.value = list;
  }

  async function selectedReturnInvoice(invoiceName: string) {
    const salesInvoiceDoc = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      invoiceName
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
      posProfile.value?.posCustomer ??
      fyo.singles.Defaults?.posCustomer ??
      '';
    sinvDoc.value.party = defaultCustomer.value;
  }

  function setItemDiscounts() {
    itemDiscounts.value = getItemDiscounts(
      sinvDoc.value.items as SalesInvoiceItem[]
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
      ModelNameEnum.AppliedCouponCodes
    ) as AppliedCouponCodes;
  }

  function setAppliedCoupons() {
    appliedCoupons.value = sinvDoc.value.coupons as AppliedCouponCodes[];
  }

  function setTotalQuantity() {
    totalQuantity.value = getTotalQuantity(
      sinvDoc.value.items as SalesInvoiceItem[]
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
    await sinvDoc.value.set('redeemLoyaltyPoints', true);
    await sinvDoc.value.runFormulas();
  }

  async function selectedInvoiceName(docVal: SalesInvoice) {
    const salesInvoiceDoc = (await fyo.doc.getDoc(
      ModelNameEnum.SalesInvoice,
      docVal.name
    )) as SalesInvoice;

    sinvDoc.value = salesInvoiceDoc;
    toggleModal('SavedInvoice', false);

    if (docVal.submitted) {
      toggleModal('Payment');
    }
  }

  function setTransferAmount(amount: Money = fyo.pesa(0)) {
    transferAmount.value = amount;
  }

  function setTransferClearanceDate(date: Date) {
    transferClearanceDate.value = date;
  }

  function setTransferRefNo(refVal: string) {
    transferRefNo.value = refVal;
  }

  function validateInvoice() {
    if (sinvDoc.value.isSubmitted) {
      throw new ValidationError(
        fyo.t`Cannot add an item to a submitted invoice.`
      );
    }

    if (sinvDoc.value.returnAgainst) {
      throw new ValidationError(
        fyo.t`Unable to add an item to the return invoice.`
      );
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

        toggleModal('BatchSelection', true);
        return;
      }

      const isInventoryItem = await fyo.getValue(
        ModelNameEnum.Item,
        itemName,
        'trackItem'
      );

      if (isInventoryItem) {
        const availableQty = itemQtyMap.value[itemName]?.availableQty ?? 0;
        if (availableQty <= 0) {
          throw new ValidationError(
            fyo.t`Item ${itemName} is out of stock (quantity is zero)`
          );
        }
      }

      const existingItems =
        sinvDoc.value.items?.filter(
          (invoiceItem) =>
            invoiceItem.item === itemName && !invoiceItem.isFreeItem
        ) ?? [];

      await validateQty(
        sinvDoc.value as SalesInvoice,
        item,
        existingItems as InvoiceItem[]
      );

      const itemsHsncode = (await fyo.getValue(
        'Item',
        itemName,
        'hsnCode'
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
              existingItem.batch
            );
            if (
              existingItem.batch != null &&
              availableQty != null &&
              availableQty > (existingItem.quantity as number)
            ) {
              const currentQty = existingItem.quantity ?? 0;
              await existingItem.set('quantity', currentQty + addQty);

              if (item.hasSerialNumber) {
                const qty = currentQty + addQty;

                const serialNumbers =
                  await getExistingActiveSerialNumbersForItem(
                    fyo,
                    itemName,
                    qty
                  );

                if (serialNumbers) {
                  itemSerialNumbers.value[itemName] = serialNumbers;
                  await existingItem.set('serialNumber', serialNumbers);
                }
              }

              await applyPricingRule();
              await sinvDoc.value.runFormulas();
              return;
            }
          }
        }

        await sinvDoc.value.append('items', {
          rate: item.rate,
          item: itemName,
          quantity: addQty,
          hsnCode: itemsHsncode,
        });

        if (item.hasSerialNumber) {
          const serialNumbers = await getExistingActiveSerialNumbersForItem(
            fyo,
            itemName,
            addQty
          );

          if (serialNumbers) {
            itemSerialNumbers.value[itemName] = serialNumbers;

            const newItemRows = sinvDoc.value.items?.filter(
              (row) => row.item === itemName && !row.isFreeItem
            );

            if (newItemRows && newItemRows.length > 0) {
              const newRow = newItemRows[newItemRows.length - 1];
              await newRow.set('serialNumber', serialNumbers);
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
              `Cannot add more than the available quantity for ${itemName}`
            );
          }
        }

        await existingItems[0].set('quantity', currentQty + addQty);
        if (item.hasSerialNumber) {
          const qty = currentQty + addQty;

          const serialNumbers = await getExistingActiveSerialNumbersForItem(
            fyo,
            itemName,
            qty
          );

          if (serialNumbers) {
            itemSerialNumbers.value[itemName] = serialNumbers;
            await existingItems[0].set('serialNumber', serialNumbers);
          }
        }

        await applyPricingRule();
        await sinvDoc.value.runFormulas();
        if (isInventoryItem) {
          await validateQty(
            sinvDoc.value as SalesInvoice,
            item,
            existingItems as InvoiceItem[]
          );
        }
        return;
      }

      await sinvDoc.value.append('items', {
        rate: item.rate,
        item: itemName,
        quantity: quantity ? quantity : 1,
        hsnCode: itemsHsncode,
      });

      if (sinvDoc.value.priceList) {
        const itemData = sinvDoc.value.items?.filter(
          (val) => val.item == itemName
        ) as SalesInvoiceItem[];

        if (itemData.length > 0) {
          itemData[0].rate = await getItemRateFromPriceList(
            itemData[0],
            sinvDoc.value.priceList
          );
        }
      }

      if (item.hasSerialNumber) {
        const qty = quantity ?? 1;

        const serialNumbers = await getExistingActiveSerialNumbersForItem(
          fyo,
          itemName,
          qty
        );

        if (serialNumbers) {
          itemSerialNumbers.value[itemName] = serialNumbers;

          const newItemRows = sinvDoc.value.items?.filter(
            (row) => row.item === itemName && !row.isFreeItem
          );

          if (newItemRows && newItemRows.length > 0) {
            const newRow = newItemRows[newItemRows.length - 1];
            await newRow.set('serialNumber', serialNumbers);
          }
        }
      }

      await applyPricingRule();
      await sinvDoc.value.runFormulas();
    } catch (error) {
      return showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
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
        item.name
      )) as Item;
      let availableQty = 0;
      if (itemDoc.trackItem) {
        availableQty =
          (await fyo.db.getStockQuantity(
            item.name,
            undefined,
            undefined,
            undefined,
            batchName
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
            !invoiceItem.isFreeItem
        ) ?? [];

      await validateQty(
        sinvDoc.value as SalesInvoice,
        itemDoc,
        existingItems as InvoiceItem[]
      );

      if (existingItems.length) {
        const currentQty = existingItems[0].quantity ?? 0;
        const addQty = quantity ?? 1;
        await existingItems[0].set('quantity', currentQty + addQty);
      } else {
        await sinvDoc.value.append('items', {
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
        type: 'error',
        message: fyo.t`${error as string}`,
      });
    }
  }

  async function createTransaction(shouldPrint = false, isPay = false) {
    try {
      sinvDoc.value.date = new Date();
      await validate();
      await submitSinvDoc();

      const visibility = await getItemVisibility(fyo);

      if (
        sinvDoc.value.stockNotTransferred &&
        visibility === 'Inventory Items'
      ) {
        await makeStockTransfer();
      }

      if (isPay) {
        await makePayment(shouldPrint);
      }

      if (shouldPrint) {
        await routeTo(
          `/print/${sinvDoc.value.schemaName}/${sinvDoc.value.name}`
        );
      }

      await afterTransaction();
      await setItems();
    } catch (error) {
      showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
      });
    }
  }

  async function makePayment(shouldPrint: boolean) {
    paymentDoc.value = sinvDoc.value.getPayment() as Payment;
    if (!paymentDoc.value) {
      return null;
    }

    const method = paymentMethod.value;

    await paymentDoc.value.set('paymentMethod', method);
    await paymentDoc.value.set('amount', fyo.pesa(paidAmount.value.float));
    await paymentDoc.value.set('referenceType', ModelNameEnum.SalesInvoice);

    const paymentMethodDoc = await paymentDoc.value.loadAndGetLink(
      'paymentMethod'
    );

    if (paymentMethodDoc?.type !== 'Cash') {
      await paymentDoc.value.setMultiple({
        referenceId: transferRefNo.value,
        clearanceDate: transferClearanceDate.value,
      });
    }

    if (paymentMethodDoc?.type === 'Cash') {
      await paymentDoc.value.setMultiple({
        paymentAccount: defaultPOSCashAccount.value,
      });
    }

    paymentDoc.value.once('afterSubmit', () => {
      showToast({
        type: 'success',
        message: fyo.t`Payment ${paymentDoc.value.name as string} is Saved`,
        duration: 'short',
      });
    });

    try {
      await paymentDoc.value?.sync();
      await paymentDoc.value?.submit();

      if (shouldPrint) {
        await routeTo(
          `/print/${sinvDoc.value.schemaName}/${sinvDoc.value.name}`
        );
      }
    } catch (error) {
      return showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
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
        'trackItem'
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

    shipmentDoc.once('afterSubmit', () => {
      showToast({
        type: 'success',
        message: fyo.t`Shipment ${shipmentDoc.name as string} is Submitted`,
        duration: 'short',
      });
    });

    try {
      await shipmentDoc.sync();
      await shipmentDoc.submit();
    } catch (error) {
      return showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
      });
    }
  }

  async function submitSinvDoc() {
    sinvDoc.value.once('afterSubmit', () => {
      showToast({
        type: 'success',
        message: fyo.t`Sales Invoice ${sinvDoc.value.name as string} is Submitted`,
        duration: 'short',
      });
    });

    try {
      await validate();
      await sinvDoc.value.runFormulas();
      await sinvDoc.value.sync();
      await sinvDoc.value.submit();
    } catch (error) {
      return showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
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
    toggleModal('Payment', false);
  }

  async function clearValues() {
    setSinvDoc();
    itemSerialNumbers.value = {};

    paidAmount.value = fyo.pesa(0);
    transferAmount.value = fyo.pesa(0);
    await setItems();

    if (!defaultCustomer.value) {
      sinvDoc.value.party = '';
    }
  }

  function toggleModal(modal: ModalName, val?: boolean) {
    const key = `open${modal}Modal` as 'openAlertModal' | 'openPaymentModal' | 'openKeyboardModal' | 'openPriceListModal' | 'openItemEnquiryModal' | 'openCouponCodeModal' | 'openShiftCloseModal' | 'openSavedInvoiceModal' | 'openLoyaltyProgramModal' | 'openAppliedCouponsModal' | 'openReturnSalesInvoiceModal' | 'openBatchSelectionModal';
    if (val !== undefined) {
      switch(key) {
        case 'openAlertModal': openAlertModal.value = val; break;
        case 'openPaymentModal': openPaymentModal.value = val; break;
        case 'openKeyboardModal': openKeyboardModal.value = val; break;
        case 'openPriceListModal': openPriceListModal.value = val; break;
        case 'openItemEnquiryModal': openItemEnquiryModal.value = val; break;
        case 'openCouponCodeModal': openCouponCodeModal.value = val; break;
        case 'openShiftCloseModal': openShiftCloseModal.value = val; break;
        case 'openSavedInvoiceModal': openSavedInvoiceModal.value = val; break;
        case 'openLoyaltyProgramModal': openLoyaltyProgramModal.value = val; break;
        case 'openAppliedCouponsModal': openAppliedCouponsModal.value = val; break;
        case 'openReturnSalesInvoiceModal': openReturnSalesInvoiceModal.value = val; break;
        case 'openBatchSelectionModal': openBatchSelectionModal.value = val; break;
      }
      return val;
    }

    switch(key) {
      case 'openAlertModal': openAlertModal.value = !openAlertModal.value; return openAlertModal.value;
      case 'openPaymentModal': openPaymentModal.value = !openPaymentModal.value; return openPaymentModal.value;
      case 'openKeyboardModal': openKeyboardModal.value = !openKeyboardModal.value; return openKeyboardModal.value;
      case 'openPriceListModal': openPriceListModal.value = !openPriceListModal.value; return openPriceListModal.value;
      case 'openItemEnquiryModal': openItemEnquiryModal.value = !openItemEnquiryModal.value; return openItemEnquiryModal.value;
      case 'openCouponCodeModal': openCouponCodeModal.value = !openCouponCodeModal.value; return openCouponCodeModal.value;
      case 'openShiftCloseModal': openShiftCloseModal.value = !openShiftCloseModal.value; return openShiftCloseModal.value;
      case 'openSavedInvoiceModal': openSavedInvoiceModal.value = !openSavedInvoiceModal.value; return openSavedInvoiceModal.value;
      case 'openLoyaltyProgramModal': openLoyaltyProgramModal.value = !openLoyaltyProgramModal.value; return openLoyaltyProgramModal.value;
      case 'openAppliedCouponsModal': openAppliedCouponsModal.value = !openAppliedCouponsModal.value; return openAppliedCouponsModal.value;
      case 'openReturnSalesInvoiceModal': openReturnSalesInvoiceModal.value = !openReturnSalesInvoiceModal.value; return openReturnSalesInvoiceModal.value;
      case 'openBatchSelectionModal': openBatchSelectionModal.value = !openBatchSelectionModal.value; return openBatchSelectionModal.value;
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
    const hasPricingRules = await getPricingRule(
      sinvDoc.value as SalesInvoice
    );

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
    const currentQtyMap = await getItemQtyMap(sinvDoc.value as SalesInvoice);

    hasPricingRules.map((pRule) => {
      const freeItemQty =
        currentQtyMap[pRule.pricingRule.freeItem as string]?.availableQty;

      if (freeItemQty <= 0) {
        sinvDoc.value.items = sinvDoc.value.items?.filter(
          (val) => !(val.isFreeItem && val.item == pRule.pricingRule.freeItem)
        );

        outOfStockFreeItems.push(pRule.pricingRule.freeItem as string);
      }
    });

    if (!outOfStockFreeItems.length) {
      return;
    }

    showToast({
      type: 'error',
      message: fyo.t`Free items out of stock: ${outOfStockFreeItems.join(', ')}`,
    });
  }

  async function routeToSinvList() {
    if (!sinvDoc.value.items?.length) {
      return await routeTo('/list/SalesInvoice');
    }

    openAlertModal.value = true;
  }

  async function handleSaveAndContinue() {
    try {
      if (!sinvDoc.value.party) {
        return showToast({
          type: 'error',
          message: fyo.t`Please add a customer before saving`,
        });
      }
      await saveInvoiceAction();
      toggleModal('Alert', false);
      await routeTo('/list/SalesInvoice');
    } catch (error) {
      showToast({
        type: 'error',
        message: fyo.t`${error as string}`,
      });
    }
  }

  function showValidationToast(method: string) {
    showToast({
      type: 'error',
      message: fyo.t`${
        !sinvDoc.value.items?.length
          ? 'Please add items'
          : 'Please select a customer'
      } before ${method}`,
    });
  }

  async function saveInvoiceAction() {
    if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
      showValidationToast('saving');
      return;
    }
    await saveOrder();
  }

  function handlePaymentAction() {
    if (!sinvDoc.value.items?.length || !sinvDoc.value.party) {
      showValidationToast('payment');
      return;
    }

    toggleModal('Payment', true);
  }

  return {
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
    additionalDiscounts,
    loyaltyPoints,
    appliedLoyaltyPoints,
    loyaltyProgram,
    appliedCouponsCount,
    appliedCoupons,
    itemSearchTerm,
    selectedItemGroup,
    paymentMethod,
    transferRefNo,
    defaultCustomer,
    transferClearanceDate,
    paymentDoc,
    sinvDoc,
    posProfile,
    itemQtyMap,
    coupons,
    itemSerialNumbers,
    quickQtyActive,
    quickQtyBuffer,
    quickQtyRow,
    selectedItemForBatch,
    pendingBatchItem,
    expandedBatchId,
    itemVisibilityValue,
    defaultPOSCashAccount,
    isDiscountingEnabled,
    isPosShiftOpen,
    itemVisibility,
    disablePayButton,
    setQuickQtySelectedRow,
    setExpandedBatchId,
    addQuickQtyListeners,
    removeQuickQtyListeners,
    hasAnyOpenModal,
    onQuickQtyKeyDown,
    onQuickQtyKeyUp,
    setCustomer,
    loadPOSProfile,
    handleItemSearch,
    getItem,
    isModalOpen,
    setShortcuts,
    saveOrder,
    setItemGroup,
    setItems,
    selectedReturnInvoice,
    toggleView,
    setPaidAmount,
    setPaymentMethod,
    setDefaultCustomer,
    setItemDiscounts,
    setItemQtyMap,
    setSinvDoc,
    setCouponCodeDoc,
    setAppliedCoupons,
    setTotalQuantity,
    ignorePricingRules,
    setTotalTaxedAmount,
    setCouponsCount,
    setLoyaltyPoints,
    selectedInvoiceName,
    setTransferAmount,
    setTransferClearanceDate,
    setTransferRefNo,
    validateInvoice,
    addItem,
    handleBatchSelected,
    createTransaction,
    makePayment,
    makeStockTransfer,
    submitSinvDoc,
    afterSync,
    afterTransaction,
    clearValues,
    toggleModal,
    updateValues,
    validate,
    applyPricingRule,
    routeToSinvList,
    handleSaveAndContinue,
    showValidationToast,
    saveInvoiceAction,
    handlePaymentAction,
  };
}
