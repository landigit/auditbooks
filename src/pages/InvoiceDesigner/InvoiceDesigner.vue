<template>
  <div
    class="flex flex-col flex-1 h-full bg-gray-25 dark:bg-gray-875 overflow-hidden"
  >
    <PageHeader
      :border="true"
      :title="isPrintView ? t`Print View` : t`Invoice Designer`"
    >
      <Button
        v-if="isPrintView"
        type="primary"
        class="text-xs"
        @click="customizeLayout"
      >
        <feather-icon name="sliders" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Customize Layout` }}</span>
      </Button>
      <Button v-if="!isPrintView" class="text-xs" @click="resetColumns">
        <feather-icon name="refresh-cw" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Reset` }}</span>
      </Button>
      <Button
        v-if="!isPrintView && selectedStyle === 'Custom'"
        class="text-xs"
        @click="save"
      >
        <feather-icon name="save" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Save Layout` }}</span>
      </Button>
      <Button
        type="primary"
        class="text-xs"
        :disabled="!values"
        @click="download"
      >
        <feather-icon name="download" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Download PDF` }}</span>
      </Button>
      <Button
        type="primary"
        class="text-xs"
        :disabled="!values"
        @click="doPrint"
      >
        <feather-icon name="printer" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Print` }}</span>
      </Button>
    </PageHeader>

    <div class="flex flex-1 overflow-hidden">
      <!-- ── Left sidebar ── -->
      <aside
        v-if="!isPrintView"
        class="w-72 shrink-0 flex flex-col border-e dark:border-gray-800 bg-white dark:bg-gray-850 overflow-y-auto custom-scroll"
      >
        <!-- Style picker -->
        <div class="p-3 border-b dark:border-gray-800">
          <p
            class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2"
          >
            {{ t`Invoice Style` }}
          </p>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="(preset, key) in STYLE_PRESETS"
              :key="key"
              class="text-left rounded-lg border-2 px-2.5 py-2 transition-all text-xs"
              :class="
                selectedStyle === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              "
              @click="selectedStyle = key as InvoiceStyleKey"
            >
              <!-- Color swatch -->
              <span
                class="inline-block w-3 h-3 rounded-full me-1.5 align-middle"
                :style="{ background: preset.primaryColor }"
              />
              <span class="font-semibold text-gray-800 dark:text-gray-200">{{
                preset.label
              }}</span>
              <p class="text-[9px] text-gray-400 mt-0.5 leading-tight">
                {{ preset.description }}
              </p>
            </button>
          </div>
        </div>

        <!-- Customization controls - only visible for Custom layout ('Quote' preset) -->
        <div v-if="selectedStyle === 'Custom'">
          <!-- Base Design Selection -->
          <div class="p-3 border-b dark:border-gray-800 flex flex-col gap-1.5">
            <label
              for="customBaseStyle"
              class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest"
            >
              {{ t`Base Design` }}
            </label>
            <select
              id="customBaseStyle"
              v-model="customBaseStyle"
              class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1.5 px-2"
            >
              <option value="Classic">{{ t`Classic` }}</option>
              <option value="Modern">{{ t`Modern` }}</option>
            </select>
          </div>

          <!-- Options -->
          <div class="p-3 border-b dark:border-gray-800 flex flex-col gap-2.5">
            <p
              class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5"
            >
              {{ t`Options` }}
            </p>
            <div class="flex items-center gap-2">
              <input
                id="showPageNumbers"
                v-model="showPageNumbers"
                type="checkbox"
                class="rounded border-gray-350 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <label
                for="showPageNumbers"
                class="text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {{ t`Show Page Numbers` }}
              </label>
            </div>
            <div class="flex items-center gap-2">
              <input
                id="displaySignature"
                v-model="displaySignature"
                type="checkbox"
                class="rounded border-gray-350 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <label
                for="displaySignature"
                class="text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {{ t`Display Signature` }}
              </label>
            </div>
            <div v-if="displaySignature" class="flex items-center gap-2 ps-6">
              <label
                for="signatureSize"
                class="text-xs text-gray-500 cursor-pointer shrink-0"
              >
                {{ t`Signature Size (px)` }}
              </label>
              <input
                id="signatureSize"
                v-model="signatureSize"
                type="number"
                class="w-16 text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1 px-1.5"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                id="displaySeal"
                v-model="displaySeal"
                type="checkbox"
                class="rounded border-gray-350 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <label
                for="displaySeal"
                class="text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {{ t`Display Seal` }}
              </label>
            </div>
            <div v-if="displaySeal" class="flex items-center gap-2 ps-6">
              <label
                for="sealSize"
                class="text-xs text-gray-500 cursor-pointer shrink-0"
              >
                {{ t`Seal Size (px)` }}
              </label>
              <input
                id="sealSize"
                v-model="sealSize"
                type="number"
                class="w-16 text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1 px-1.5"
              />
            </div>
            <div class="flex flex-col gap-1 mt-1">
              <label
                for="sigSealPosition"
                class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest"
              >
                {{ t`Seal Position` }}
              </label>
              <select
                id="sigSealPosition"
                v-model="sigSealPosition"
                class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1.5 px-2"
              >
                <option value="authorized_signatory">
                  {{ t`Under Authorized Signatory` }}
                </option>
                <option value="before_terms">
                  {{ t`Before Terms and Conditions` }}
                </option>
                <option value="after_terms">
                  {{ t`After Terms and Conditions` }}
                </option>
              </select>
            </div>
          </div>

          <!-- Branding Customizer -->
          <div class="p-3 border-b dark:border-gray-800 flex flex-col gap-2.5">
            <p
              class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5"
            >
              {{ t`Branding Customizer` }}
            </p>
            <div class="flex items-center justify-between gap-2">
              <label
                for="primaryColor"
                class="text-xs text-gray-700 dark:text-gray-300"
              >
                {{ t`Primary Color` }}
              </label>
              <input
                id="primaryColor"
                v-model="primaryColor"
                type="color"
                class="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <label
                for="accentColor"
                class="text-xs text-gray-700 dark:text-gray-300"
              >
                {{ t`Accent Color` }}
              </label>
              <input
                id="accentColor"
                v-model="accentColor"
                type="color"
                class="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
              />
            </div>
            <div class="flex flex-col gap-1 mt-1">
              <label
                for="fontFamily"
                class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest"
              >
                {{ t`Font Family` }}
              </label>
              <select
                id="fontFamily"
                v-model="fontFamily"
                class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1.5 px-2"
              >
                <option value="Roboto">Roboto</option>
                <option value="Courier">Courier</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Figtree">Figtree</option>
              </select>
            </div>
            <div class="flex flex-col gap-1 mt-1">
              <label
                for="pageOrientation"
                class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest"
              >
                {{ t`Page Orientation` }}
              </label>
              <select
                id="pageOrientation"
                v-model="pageOrientation"
                class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1.5 px-2"
              >
                <option value="portrait">{{ t`Portrait` }}</option>
                <option value="landscape">{{ t`Landscape` }}</option>
              </select>
            </div>
          </div>

          <!-- Legal & Payment Info -->
          <div class="p-3 border-b dark:border-gray-800 flex flex-col gap-2.5">
            <p
              class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-0.5"
            >
              {{ t`Legal & Payment Info` }}
            </p>
            <div class="flex flex-col gap-1">
              <label
                for="bankDetails"
                class="text-xs text-gray-700 dark:text-gray-300"
              >
                {{ t`Bank Details` }}
              </label>
              <textarea
                id="bankDetails"
                v-model="bankDetails"
                rows="3"
                class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1 px-1.5"
                placeholder="Bank Name, A/C No, IFSC..."
              ></textarea>
            </div>
            <div class="flex items-center gap-2">
              <input
                id="displayPaymentQr"
                v-model="displayPaymentQr"
                type="checkbox"
                class="rounded border-gray-350 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <label
                for="displayPaymentQr"
                class="text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {{ t`Display UPI QR Code` }}
              </label>
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="termsAndConditions"
                class="text-xs text-gray-700 dark:text-gray-300"
              >
                {{ t`Terms & Conditions` }}
              </label>
              <textarea
                id="termsAndConditions"
                v-model="termsAndConditions"
                rows="3"
                class="w-full text-xs rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-gray-200 py-1 px-1.5"
                placeholder="Terms of service, payment policies..."
              ></textarea>
            </div>
          </div>

          <!-- Column configurator -->
          <div class="p-3 flex flex-col gap-2">
            <p
              class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1"
            >
              {{ t`Columns` }} — drag to reorder
            </p>

            <div
              v-for="(col, idx) in columns"
              :key="col.fieldname"
              draggable="true"
              class="transition-opacity"
              :class="dragging === idx ? 'opacity-40' : ''"
              @dragstart="onDragStart(idx)"
              @dragover.prevent="onDragOver(idx)"
              @drop="onDrop"
            >
              <ColumnEditor
                :col="col"
                @update:col="(c) => (columns[idx] = c)"
              />
            </div>

            <!-- Add unused fields -->
            <div
              v-if="unusedFields.length"
              class="mt-2 pt-2 border-t dark:border-gray-700"
            >
              <p
                class="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5"
              >
                {{ t`Add field` }}
              </p>
              <div class="flex gap-1 flex-wrap">
                <button
                  v-for="f in unusedFields"
                  :key="f.fieldname"
                  class="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-300 border dark:border-gray-700"
                  @click="addField(f)"
                >
                  + {{ f.fieldname }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="p-5 text-center text-xs text-gray-500 border-t dark:border-gray-800 flex flex-col gap-2 items-center justify-center"
        >
          <feather-icon name="info" class="w-6 h-6 text-gray-400 mb-1" />
          <p class="font-bold text-gray-700 dark:text-gray-300 text-xs">
            {{ t`Standard Layout (Read-Only)` }}
          </p>
          <p class="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
            {{
              t`Modern, Classic, and POS layouts are system defaults and cannot be customized.`
            }}
          </p>
        </div>
      </aside>

      <!-- ── Right: live preview ── -->
      <main
        class="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6 custom-scroll"
      >
        <div v-if="!values" class="text-sm text-gray-500 text-center mt-20">
          {{ t`Loading invoice data…` }}
        </div>
        <template v-else>
          <div
            v-if="effectiveStyle === 'Modern'"
            ref="previewContainer"
            class="bg-white mx-auto rounded-none shadow-md invoice-preview-card"
            style="
              width: 794px;
              min-height: 1123px;
              padding: 48px;
              box-sizing: border-box;
              position: relative;
              color: #000;
              line-height: 1.3;
            "
            :style="{ fontFamily: fontFamily }"
          >
            <!-- ── Header ── -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 24px;
              "
            >
              <div>
                <img
                  v-if="printData.displayLogo && printData.logo"
                  alt="Logo"
                  style="max-width: 120px; height: auto; object-fit: contain"
                  :src="printData.logo"
                />
                <div
                  v-else
                  style="font-size: 1.25rem; font-weight: bold; color: #000"
                >
                  {{ printData.companyName }}
                </div>
              </div>
              <div style="text-align: right">
                <h1 style="font-size: 1.25rem; font-weight: bold; margin: 0">
                  {{ docData.entryLabel || t`Tax Invoice/Bill of Supply` }}
                </h1>
                <p
                  style="font-size: 0.72rem; color: #6b7280; margin: 2px 0 0 0"
                >
                  (Original for Recipient)
                </p>
              </div>
            </div>

            <!-- ── Address Section ── -->
            <div
              style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 32px;
                margin-bottom: 16px;
                font-size: 0.75rem;
              "
            >
              <!-- Left Column: Sold By -->
              <div>
                <h2 style="font-weight: bold; margin: 0 0 4px 0">Sold By :</h2>
                <div style="white-space: pre-line; color: #1f2937">
                  {{ printData.companyName }}
                  {{
                    printData.links?.address?.addressDisplay ||
                    printData.address
                  }}
                </div>
                <div style="margin-top: 6px; font-size: 0.7rem; color: #374151">
                  <p v-if="printData.pan" style="margin: 0">
                    <span style="font-weight: bold">PAN No:</span>
                    {{ printData.pan }}
                  </p>
                  <p v-if="printData.gstin" style="margin: 2px 0 0 0">
                    <span style="font-weight: bold">GST Registration No:</span>
                    {{ printData.gstin }}
                  </p>
                </div>
              </div>
              <!-- Right Column: Billing Address -->
              <div style="text-align: right">
                <h2 style="font-weight: bold; margin: 0 0 4px 0">
                  Billing Address :
                </h2>
                <div style="white-space: pre-line; color: #1f2937">
                  {{ docData.party }}
                  {{
                    docData.links?.party?.links?.address?.addressDisplay ||
                    docData.links?.party?.address ||
                    ''
                  }}
                </div>
                <div
                  v-if="docData.partyGSTIN"
                  style="margin-top: 6px; font-size: 0.7rem; color: #374151"
                >
                  <p style="margin: 0">
                    <span style="font-weight: bold">GSTIN:</span>
                    {{ docData.partyGSTIN }}
                  </p>
                </div>
              </div>
            </div>

            <!-- ── Shipping Address ── -->
            <div
              style="
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-bottom: 20px;
                font-size: 0.75rem;
              "
            >
              <div style="text-align: right">
                <h2 style="font-weight: bold; margin: 0 0 4px 0">
                  Shipping Address :
                </h2>
                <div style="white-space: pre-line; color: #1f2937">
                  {{ docData.party }}
                  {{
                    docData.links?.shippingAddress?.addressDisplay ||
                    docData.links?.party?.links?.address?.addressDisplay ||
                    docData.links?.party?.address ||
                    ''
                  }}
                </div>
              </div>
            </div>

            <!-- ── Meta Information ── -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 12px;
                font-size: 0.72rem;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 8px;
              "
            >
              <div>
                <p v-if="docData.orderNumber" style="margin: 0">
                  <span style="font-weight: bold">Order Number:</span>
                  {{ docData.orderNumber }}
                </p>
                <p style="margin: 2px 0 0 0">
                  <span style="font-weight: bold">Order Date:</span>
                  {{ docData.date }} {{ docData.time }}
                </p>
              </div>
              <div style="text-align: right">
                <p style="margin: 0">
                  <span style="font-weight: bold">Invoice Number :</span>
                  {{ docData.name }}
                </p>
                <p style="margin: 2px 0 0 0">
                  <span style="font-weight: bold">Invoice Date :</span>
                  {{ docData.date }} {{ docData.time }}
                </p>
              </div>
            </div>

            <!-- ── Items Table ── -->
            <table
              style="
                width: 100%;
                border-collapse: collapse;
                font-size: 0.72rem;
                margin-bottom: 12px;
                border: 1px solid #000;
              "
            >
              <thead>
                <tr style="background: #f3f4f6; border-bottom: 1px solid #000">
                  <th
                    v-for="col in visibleColumns"
                    :key="col.fieldname"
                    style="
                      padding: 6px 8px;
                      font-weight: bold;
                      border-right: 1px solid #000;
                      color: #000;
                    "
                    :style="{ textAlign: col.align }"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in docItems"
                  :key="String(row.name ?? idx)"
                  style="border-bottom: 1px solid #000"
                >
                  <td
                    v-for="col in visibleColumns"
                    :key="col.fieldname"
                    style="padding: 6px 8px; border-right: 1px solid #000"
                    :style="{ textAlign: col.align }"
                  >
                    {{
                      col.fieldname === 'idx'
                        ? idx + 1
                        : (row[col.fieldname] ?? '')
                    }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- ── Totals ── -->
            <div
              style="
                display: flex;
                justify-content: flex-end;
                margin-bottom: 16px;
              "
            >
              <div style="width: 220px; font-size: 0.72rem">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #4b5563;
                    margin-bottom: 3px;
                  "
                >
                  <span>{{ t`Total` }}</span
                  ><span>{{ docData.netTotal }}</span>
                </div>
                <div
                  v-for="tax in docTaxes"
                  :key="tax.account"
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #4b5563;
                    margin-bottom: 2px;
                  "
                >
                  <span>{{ tax.account }}</span
                  ><span>{{ tax.amount }}</span>
                </div>
                <div
                  v-if="printData.roundOffGrandTotal && docData.hasRoundOff"
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #4b5563;
                    margin-bottom: 2px;
                  "
                >
                  <span>Round Off</span><span>{{ docData.roundOff }}</span>
                </div>
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 0.85rem;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 6px;
                    margin-top: 4px;
                    color: #000;
                  "
                >
                  <span>{{ t`Grand Total` }}</span
                  ><span>{{
                    printData.roundOffGrandTotal
                      ? docData.roundedGrandTotal
                      : docData.grandTotal
                  }}</span>
                </div>
              </div>
            </div>

            <!-- ── Amount in Words ── -->
            <div
              v-if="printData.amountInWords && docData.grandTotalInWords"
              style="
                border: 1px solid #000;
                padding: 8px;
                margin-bottom: 16px;
                font-size: 0.72rem;
              "
            >
              <p style="font-weight: bold; margin: 0 0 2px 0">
                Amount in Words:
              </p>
              <p style="margin: 0; color: #374151">
                {{ docData.grandTotalInWords }}
              </p>
            </div>

            <!-- ── Bank Details & UPI QR Code ── -->
            <div
              v-if="printData.bankDetails"
              style="
                border: 1px solid #e5e7eb;
                padding: 8px;
                margin-bottom: 12px;
                font-size: 0.72rem;
              "
            >
              <p style="font-weight: bold; margin: 0 0 2px 0">Bank Details:</p>
              <p style="margin: 0; color: #4b5563; white-space: pre-line">
                {{ printData.bankDetails }}
              </p>
            </div>

            <div
              v-if="printData.displayPaymentQr"
              style="
                display: inline-block;
                border: 1px solid #e5e7eb;
                padding: 8px;
                margin-bottom: 12px;
                font-size: 0.72rem;
                text-align: center;
              "
            >
              <p style="font-weight: bold; margin: 0 0 4px 0">
                Scan to Pay (UPI)
              </p>
              <div
                style="
                  background: #f3f4f6;
                  width: 80px;
                  height: 80px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  font-size: 8px;
                  border: 1px dashed #9ca3af;
                  color: #6b7280;
                "
              >
                [UPI QR Code]
              </div>
            </div>

            <!-- ── Signature Section ── -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: start;
                font-size: 0.72rem;
                margin-top: 16px;
              "
            >
              <div style="color: #4b5563; max-width: 55%">
                <div style="margin-top: 8px">
                  <!-- BEFORE TERMS -->
                  <div
                    v-if="
                      printData.sigSealPosition === 'before_terms' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    style="
                      display: flex;
                      justify-content: start;
                      align-items: flex-end;
                      gap: 16px;
                      margin-top: 8px;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                      "
                    >
                      <img
                        :src="printData.seal"
                        :style="{ width: (printData.sealSize || 50) + 'px' }"
                        style="height: auto"
                      />
                      <span
                        style="
                          font-size: 0.6rem;
                          color: #6b7280;
                          margin-top: 2px;
                        "
                        >Seal</span
                      >
                    </div>
                  </div>

                  <div
                    v-if="printData.termsAndConditions"
                    style="margin-top: 8px"
                  >
                    <p style="font-weight: bold; margin: 0">
                      Terms & Conditions:
                    </p>
                    <p
                      style="
                        margin: 2px 0 0 0;
                        font-size: 0.65rem;
                        color: #6b7280;
                        line-height: 1.3;
                        white-space: pre-line;
                      "
                    >
                      {{ printData.termsAndConditions }}
                    </p>
                  </div>

                  <!-- AFTER TERMS -->
                  <div
                    v-if="
                      printData.sigSealPosition === 'after_terms' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    style="
                      display: flex;
                      justify-content: start;
                      align-items: flex-end;
                      gap: 16px;
                      margin-top: 8px;
                    "
                  >
                    <div
                      style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                      "
                    >
                      <img
                        :src="printData.seal"
                        :style="{ width: (printData.sealSize || 50) + 'px' }"
                        style="height: auto"
                      />
                      <span
                        style="
                          font-size: 0.6rem;
                          color: #6b7280;
                          margin-top: 2px;
                        "
                        >Seal</span
                      >
                    </div>
                  </div>
                </div>
              </div>
              <div
                style="
                  border: 1px solid #000;
                  padding: 8px;
                  min-width: 200px;
                  text-align: right;
                "
              >
                <p
                  style="font-weight: bold; margin: 0 0 4px 0; text-align: left"
                >
                  For {{ printData.companyName }}:
                </p>
                <div
                  v-if="
                    (printData.displaySignature && printData.signature) ||
                    (printData.sigSealPosition === 'authorized_signatory' &&
                      printData.displaySeal &&
                      printData.seal)
                  "
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    margin: 4px 0;
                    min-height: 35px;
                  "
                >
                  <img
                    v-if="printData.displaySignature && printData.signature"
                    :src="printData.signature"
                    :style="{
                      width: (printData.signatureSize || 80) * 0.75 + 'px',
                    }"
                    style="height: auto"
                  />
                  <img
                    v-if="
                      printData.sigSealPosition === 'authorized_signatory' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    :src="printData.seal"
                    :style="{ width: (printData.sealSize || 50) * 0.75 + 'px' }"
                    style="height: auto"
                  />
                </div>
                <div v-else style="height: 35px"></div>
                <p style="font-weight: bold; margin: 0">Authorized Signatory</p>
              </div>
            </div>

            <!-- Page breaks / page numbers overlay -->
            <div
              v-if="showPageNumbers"
              class="absolute left-0 right-0 top-0 bottom-0 pointer-events-none"
              style="overflow: hidden"
            >
              <template v-for="p in pageCount" :key="p">
                <div
                  v-if="p < pageCount"
                  class="absolute left-0 right-0 border-t border-dashed border-gray-400 flex justify-center items-center"
                  :style="{ top: `${p * 1123}px`, zIndex: 10 }"
                >
                  <span
                    class="bg-gray-100 px-2 py-0.5 text-[9px] text-gray-500 rounded border border-gray-300 translate-y-[-50%] pointer-events-auto"
                  >
                    {{ t`Page Break` }}
                  </span>
                </div>
                <div
                  class="absolute right-8 text-[10px] text-gray-500 font-sans"
                  :style="{ top: `${p * 1123 - 28}px`, zIndex: 10 }"
                >
                  {{ t`Page` }} {{ p }} {{ t`of` }} {{ pageCount }}
                </div>
              </template>
            </div>
          </div>

          <!-- POS Style card -->
          <div
            v-else-if="effectiveStyle === 'POS'"
            class="bg-white mx-auto shadow-md border invoice-preview-card"
            style="
              width: 320px;
              padding: 16px;
              font-family: 'Figtree', sans-serif;
              color: #000;
              font-size: 13px;
            "
          >
            <!-- Logo -->
            <div
              v-if="printData.displayLogo && printData.logo"
              style="text-align: center; margin-bottom: 8px"
            >
              <img
                :src="printData.logo"
                style="max-width: 100px; height: auto; display: inline-block"
              />
            </div>

            <!-- Company Name -->
            <h2
              style="
                font-weight: 600;
                text-align: center;
                font-size: 16px;
                margin: 4px 0;
              "
              :style="{ color: printData.color || '#000' }"
            >
              {{ printData.companyName }}
            </h2>

            <!-- Address -->
            <p
              v-if="printData.address"
              style="text-align: center; margin: 2px 0"
            >
              {{
                printData.links?.address?.addressDisplay || printData.address
              }}
            </p>

            <!-- Phone & Email -->
            <p style="text-align: center; margin: 2px 0">
              {{ printData.phone }}
            </p>
            <p style="text-align: center; margin: 2px 0">
              {{ printData.email }}
            </p>

            <!-- Title -->
            <h4
              style="
                font-weight: 600;
                text-align: center;
                font-size: 16px;
                margin: 12px 0 6px 0;
              "
            >
              Invoice
            </h4>

            <!-- Meta details -->
            <div
              style="
                border-bottom: 1px dashed #000;
                padding-bottom: 6px;
                margin-bottom: 8px;
              "
            >
              <table style="width: 100%; font-size: 12px">
                <tbody>
                  <tr>
                    <td style="font-weight: bold; width: 75px">Invoice No</td>
                    <td style="width: 10px">:</td>
                    <td>{{ docData.name }}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold">Customer</td>
                    <td>:</td>
                    <td>{{ docData.party }}</td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold">Date</td>
                    <td>:</td>
                    <td>{{ docData.date }} {{ docData.time }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Items table -->
            <table
              style="
                width: 100%;
                font-size: 12px;
                border-collapse: collapse;
                margin-bottom: 8px;
              "
            >
              <thead>
                <tr
                  style="
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    font-weight: bold;
                  "
                >
                  <th style="text-align: left; padding: 4px 0; width: 20px">
                    {{ t`SI` }}
                  </th>
                  <th style="text-align: left; padding: 4px 0">
                    {{ t`Item` }}
                  </th>
                  <th style="text-align: left; padding: 4px 0; width: 30px">
                    {{ t`Qty` }}
                  </th>
                  <th style="text-align: right; padding: 4px 0; width: 60px">
                    {{ t`Price` }}
                  </th>
                  <th style="text-align: right; padding: 4px 0; width: 60px">
                    {{ t`Amount` }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in docItems"
                  :key="String(row.name ?? idx)"
                >
                  <td style="padding: 4px 0">{{ idx + 1 }}</td>
                  <td style="padding: 4px 0">{{ row.item }}</td>
                  <td style="padding: 4px 0">{{ row.quantity ?? row.qty }}</td>
                  <td style="text-align: right; padding: 4px 0">
                    {{ row.rate }}
                  </td>
                  <td style="text-align: right; padding: 4px 0">
                    {{ row.amount }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Totals row -->
            <div
              style="
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 12px;
                margin-bottom: 8px;
              "
            >
              <span>Total</span>
              <span>{{ docData.netTotal }}</span>
            </div>

            <!-- Net Total To Pay -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 15px;
                margin-bottom: 12px;
              "
            >
              <span>Net Total To Pay</span>
              <span>{{ docData.grandTotal }}</span>
            </div>

            <!-- Tax breakdown -->
            <div
              v-if="docTaxes.length"
              style="
                border-top: 1px solid #000;
                padding-top: 6px;
                margin-bottom: 12px;
                font-size: 12px;
              "
            >
              <p
                style="
                  text-align: center;
                  font-weight: bold;
                  font-size: 14px;
                  margin: 0 0 6px 0;
                "
              >
                Tax Summary
              </p>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  padding-left: 10px;
                "
              >
                <span>Total Ex.Tax</span>
                <span>{{ docData.subTotal }}</span>
              </div>
              <div
                v-for="tax in docTaxes"
                :key="tax.account"
                style="
                  display: flex;
                  justify-content: space-between;
                  padding-left: 10px;
                "
              >
                <span>{{ tax.account }}</span>
                <span>{{ tax.amount }}</span>
              </div>
            </div>

            <!-- Payment breakdown -->
            <div
              style="
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 6px 0;
                font-size: 12px;
                margin-bottom: 12px;
              "
            >
              <div
                style="
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  font-weight: bold;
                  margin-bottom: 4px;
                "
              >
                <span>{{ t`Payment` }}</span>
                <span style="text-align: right">{{ t`Tendered` }}</span>
                <span style="text-align: right">{{ t`Balance` }}</span>
              </div>
              <div
                style="
                  display: grid;
                  grid-template-columns: 1fr 1fr 1fr;
                  border-top: 1px dashed #ccc;
                  padding-top: 4px;
                "
              >
                <span>{{ t`Discount` }}</span>
                <span style="text-align: right">{{
                  docData.totalDiscount ? docData.totalDiscount : '00.00'
                }}</span>
                <span></span>
              </div>
              <div
                v-for="row in docData.paymentDetails"
                :key="row.paymentMethod"
                style="display: grid; grid-template-columns: 1fr 1fr 1fr"
              >
                <span>{{ row.paymentMethod }}</span>
                <span style="text-align: right">{{ row.amount }}</span>
                <span style="text-align: right">{{
                  row.outstandingAmount
                }}</span>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; font-size: 13px; margin-top: 12px">
              ***** Thank You Visit Again *****
            </div>
          </div>

          <div
            v-else
            ref="previewContainer"
            class="bg-white mx-auto rounded-none shadow-md invoice-preview-card"
            style="
              width: 794px;
              min-height: 1123px;
              padding: 48px;
              box-sizing: border-box;
              position: relative;
            "
            :style="{ fontFamily: fontFamily }"
          >
            <!-- ── Header ── -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
              "
            >
              <div>
                <div
                  style="font-size: 1.25rem; font-weight: 900; line-height: 1.2"
                  :style="{ color: currentPreset.primaryColor }"
                >
                  {{ printData.companyName }}
                </div>
                <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 2px">
                  {{ printData.address }}
                </div>
                <div
                  v-if="printData.gstin"
                  style="font-size: 0.7rem; color: #9ca3af"
                >
                  GST: {{ printData.gstin }}
                </div>
              </div>
              <div style="text-align: right">
                <span
                  style="
                    display: inline-block;
                    padding: 4px 14px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #fff;
                  "
                  :style="{ background: currentPreset.primaryColor }"
                  >{{ docData.entryLabel || 'TAX INVOICE' }}</span
                >
                <div
                  style="font-size: 0.72rem; color: #6b7280; margin-top: 4px"
                >
                  # {{ docData.name }}
                </div>
                <div style="font-size: 0.7rem; color: #9ca3af">
                  {{ docData.date }} {{ docData.time }}
                </div>
              </div>
            </div>

            <!-- ── Accent bar ── -->
            <div
              style="height: 3px; border-radius: 2px; margin-bottom: 16px"
              :style="{ background: currentPreset.accentColor }"
            />

            <!-- ── Address ── -->
            <div
              style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                margin-bottom: 16px;
              "
            >
              <div style="font-size: 0.72rem">
                <div
                  style="
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.62rem;
                    letter-spacing: 0.08em;
                    margin-bottom: 3px;
                  "
                  :style="{ color: currentPreset.primaryColor }"
                >
                  {{ t`Sold By` }}
                </div>
                <div style="font-weight: 600">{{ printData.companyName }}</div>
                <div style="color: #6b7280">
                  {{ printData.gstin ? `GSTIN: ${printData.gstin}` : '' }}
                </div>
              </div>
              <div style="font-size: 0.72rem; text-align: right">
                <div
                  style="
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.62rem;
                    letter-spacing: 0.08em;
                    margin-bottom: 3px;
                  "
                  :style="{ color: currentPreset.primaryColor }"
                >
                  {{ t`Bill To` }}
                </div>
                <div style="font-weight: 600">{{ docData.party }}</div>
                <div style="color: #6b7280">
                  {{ docData.partyGSTIN ? `GSTIN: ${docData.partyGSTIN}` : '' }}
                </div>
              </div>
            </div>

            <!-- ── Items table ── -->
            <table
              style="
                width: 100%;
                border-collapse: collapse;
                font-size: 0.72rem;
                margin-bottom: 12px;
              "
            >
              <thead>
                <tr :style="{ background: currentPreset.primaryColor }">
                  <th
                    v-for="col in visibleColumns"
                    :key="col.fieldname"
                    style="padding: 7px 10px; font-weight: 600"
                    :style="{
                      color: currentPreset.headerTextColor,
                      textAlign: col.align,
                    }"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in docItems"
                  :key="String(row.name ?? idx)"
                  :style="{
                    background: idx % 2 === 1 ? '#f9fafb' : '#ffffff',
                    borderBottom: `1px solid ${currentPreset.primaryColor}1a`,
                  }"
                >
                  <td
                    v-for="col in visibleColumns"
                    :key="col.fieldname"
                    style="padding: 6px 10px"
                    :style="{ textAlign: col.align }"
                  >
                    {{
                      col.fieldname === 'idx'
                        ? idx + 1
                        : (row[col.fieldname] ?? '')
                    }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- ── Totals ── -->
            <div
              style="
                display: flex;
                justify-content: flex-end;
                margin-bottom: 12px;
              "
            >
              <div style="width: 220px; font-size: 0.72rem">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #6b7280;
                    margin-bottom: 3px;
                  "
                >
                  <span>{{ t`Total` }}</span
                  ><span>{{ docData.netTotal }}</span>
                </div>
                <div
                  v-for="tax in docTaxes"
                  :key="tax.account"
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #9ca3af;
                    margin-bottom: 2px;
                  "
                >
                  <span>{{ tax.account }}</span
                  ><span>{{ tax.amount }}</span>
                </div>
                <div
                  v-if="printData.roundOffGrandTotal && docData.hasRoundOff"
                  style="
                    display: flex;
                    justify-content: space-between;
                    color: #6b7280;
                    margin-bottom: 2px;
                  "
                >
                  <span>Round Off</span><span>{{ docData.roundOff }}</span>
                </div>
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    font-weight: 700;
                    font-size: 0.85rem;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 6px;
                    margin-top: 4px;
                  "
                  :style="{ color: currentPreset.primaryColor }"
                >
                  <span>{{ t`Grand Total` }}</span
                  ><span>{{
                    printData.roundOffGrandTotal
                      ? docData.roundedGrandTotal
                      : docData.grandTotal
                  }}</span>
                </div>
              </div>
            </div>

            <!-- ── Amount in words ── -->
            <div
              v-if="printData.amountInWords && docData.grandTotalInWords"
              style="font-size: 0.7rem; color: #6b7280; margin-top: 4px"
            >
              <span style="font-weight: 600">{{ t`Amount in Words` }}: </span
              >{{ docData.grandTotalInWords }}
            </div>

            <!-- ── Bank Details & UPI QR Code ── -->
            <div
              v-if="printData.bankDetails"
              style="
                border: 1px solid #e5e7eb;
                padding: 8px;
                margin-top: 12px;
                margin-bottom: 12px;
                font-size: 0.72rem;
              "
            >
              <p style="font-weight: bold; margin: 0 0 2px 0">Bank Details:</p>
              <p style="margin: 0; color: #4b5563; white-space: pre-line">
                {{ printData.bankDetails }}
              </p>
            </div>

            <div
              v-if="printData.displayPaymentQr"
              style="
                display: inline-block;
                border: 1px solid #e5e7eb;
                padding: 8px;
                margin-bottom: 12px;
                font-size: 0.72rem;
                text-align: center;
              "
            >
              <p style="font-weight: bold; margin: 0 0 4px 0">
                Scan to Pay (UPI)
              </p>
              <div
                style="
                  background: #f3f4f6;
                  width: 80px;
                  height: 80px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  font-size: 8px;
                  border: 1px dashed #9ca3af;
                  color: #6b7280;
                "
              >
                [UPI QR Code]
              </div>
            </div>

            <!-- ── Signature Section ── -->
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: start;
                font-size: 0.72rem;
                margin-top: 16px;
              "
            >
              <div style="color: #4b5563; max-width: 55%">
                <div style="margin-top: 8px">
                  <!-- BEFORE TERMS -->
                  <div
                    v-if="
                      printData.sigSealPosition === 'before_terms' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    style="
                      display: flex;
                      justify-content: start;
                      align-items: center;
                      gap: 16px;
                      margin-top: 8px;
                      margin-bottom: 8px;
                    "
                  >
                    <img
                      :src="printData.seal"
                      :style="{ width: (printData.sealSize || 50) + 'px' }"
                      style="height: auto"
                    />
                  </div>

                  <div
                    v-if="printData.termsAndConditions"
                    style="margin-top: 8px"
                  >
                    <p style="font-weight: bold; margin: 0">
                      Terms & Conditions:
                    </p>
                    <p
                      style="
                        margin: 2px 0 0 0;
                        font-size: 0.65rem;
                        color: #6b7280;
                        line-height: 1.3;
                        white-space: pre-line;
                      "
                    >
                      {{ printData.termsAndConditions }}
                    </p>
                  </div>

                  <!-- AFTER TERMS -->
                  <div
                    v-if="
                      printData.sigSealPosition === 'after_terms' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    style="
                      display: flex;
                      justify-content: start;
                      align-items: center;
                      gap: 16px;
                      margin-top: 8px;
                    "
                  >
                    <img
                      :src="printData.seal"
                      :style="{ width: (printData.sealSize || 50) + 'px' }"
                      style="height: auto"
                    />
                  </div>
                </div>
              </div>
              <div style="min-width: 200px; text-align: right">
                <p
                  style="font-weight: bold; margin: 0 0 4px 0; text-align: left"
                >
                  For {{ printData.companyName }}:
                </p>
                <div
                  v-if="
                    (printData.displaySignature && printData.signature) ||
                    (printData.sigSealPosition === 'authorized_signatory' &&
                      printData.displaySeal &&
                      printData.seal)
                  "
                  style="
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 8px;
                    margin: 4px 0;
                    min-height: 35px;
                  "
                >
                  <img
                    v-if="printData.displaySignature && printData.signature"
                    :src="printData.signature"
                    :style="{
                      width: (printData.signatureSize || 80) * 0.75 + 'px',
                    }"
                    style="height: auto"
                  />
                  <img
                    v-if="
                      printData.sigSealPosition === 'authorized_signatory' &&
                      printData.displaySeal &&
                      printData.seal
                    "
                    :src="printData.seal"
                    :style="{ width: (printData.sealSize || 50) * 0.75 + 'px' }"
                    style="height: auto"
                  />
                </div>
                <div v-else style="height: 35px"></div>
                <p style="font-weight: bold; margin: 0; color: #555">
                  Authorized Signatory
                </p>
              </div>
            </div>

            <!-- Page breaks / page numbers overlay -->
            <div
              v-if="showPageNumbers"
              class="absolute left-0 right-0 top-0 bottom-0 pointer-events-none"
              style="overflow: hidden"
            >
              <template v-for="p in pageCount" :key="p">
                <div
                  v-if="p < pageCount"
                  class="absolute left-0 right-0 border-t border-dashed border-gray-400 flex justify-center items-center"
                  :style="{ top: `${p * 1123}px`, zIndex: 10 }"
                >
                  <span
                    class="bg-gray-100 px-2 py-0.5 text-[9px] text-gray-500 rounded border border-gray-300 translate-y-[-50%] pointer-events-auto"
                  >
                    {{ t`Page Break` }}
                  </span>
                </div>
                <div
                  class="absolute right-8 text-[10px] text-gray-500 font-sans"
                  :style="{ top: `${p * 1123 - 28}px`, zIndex: 10 }"
                >
                  {{ t`Page` }} {{ p }} {{ t`of` }} {{ pageCount }}
                </div>
              </template>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fyo } from 'src/initFyo';
import { ModelNameEnum } from 'models/types';
import Button from 'src/components/Button.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ColumnEditor from './ColumnEditor.vue';
import { useApp } from 'src/composables/useApp';
import { usePrintView } from 'src/composables/usePrintView';
import { showToast } from 'src/utils/interactive';
import { routeTo } from 'src/utils/ui';
import {
  type ColumnDef,
  type PdfInvoiceValues,
  type InvoiceStyleKey,
  STYLE_PRESETS,
  DEFAULT_COLUMNS,
  ALL_AVAILABLE_FIELDS,
  loadColumnConfig,
  saveColumnConfig,
  downloadInvoicePdf,
  printInvoicePdf,
} from 'src/composables/usePdfInvoice';

const props = defineProps<{ schemaName: string; name: string }>();
const { t } = useApp();
const route = useRoute();
const router = useRouter();

const isPrintView = computed(
  () => route.name === 'PrintView' || route.path.startsWith('/print/')
);

function customizeLayout() {
  const tName = String(
    fyo.singles.Defaults?.get(
      props.schemaName[0].toLowerCase() +
        props.schemaName.slice(1) +
        'PrintTemplate'
    ) || ''
  );
  routeTo(
    `/invoice-designer/${props.schemaName}/${encodeURIComponent(props.name)}?templateName=${encodeURIComponent(tName)}`
  );
}

const { values: rawValues, initialize } = usePrintView(props);

const columns = ref<ColumnDef[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));
const selectedStyle = ref<InvoiceStyleKey>('Classic');
const customBaseStyle = ref<'Classic' | 'Modern' | 'POS'>('Classic');
const dragging = ref<number | null>(null);
let dragOverIdx = -1;

// ── computed helpers ──
const values = computed(() => rawValues.value as PdfInvoiceValues | null);
const effectiveStyle = computed(() => {
  if (
    selectedStyle.value === 'Custom' ||
    (selectedStyle.value as string) === 'Quote'
  ) {
    return customBaseStyle.value || 'Classic';
  }
  return selectedStyle.value;
});
const currentPreset = computed(() => {
  const style = effectiveStyle.value;
  const key =
    (style as string) === 'Amazon'
      ? 'Modern'
      : (((style as string) === 'Quote' ? 'Custom' : style) as InvoiceStyleKey);
  const preset = STYLE_PRESETS[key] || STYLE_PRESETS.Classic;
  return {
    ...preset,
    primaryColor: primaryColor.value || preset.primaryColor,
    accentColor: accentColor.value || preset.accentColor,
  };
});
const pageCount = computed(() => {
  return Math.ceil(containerHeight.value / 1123) || 1;
});
const docData = computed(() => (values.value?.doc ?? {}) as any);
const printData = computed(() => (values.value?.print ?? {}) as any);
const visibleColumns = computed(() => columns.value.filter((c) => c.visible));
const usedFieldnames = computed(
  () => new Set(columns.value.map((c) => c.fieldname))
);

const showPageNumbers = ref(true);
const containerHeight = ref(1123);
const previewContainer = ref<HTMLElement | null>(null);

// Signature and Seal options
const displaySignature = ref(false);
const displaySeal = ref(false);
const sigSealPosition = ref('before_terms');
const signatureSize = ref(80);
const sealSize = ref(50);

// Visual & Branding refs
const primaryColor = ref('#000000');
const accentColor = ref('#f3f4f6');
const fontFamily = ref('Figtree');
const pageOrientation = ref('portrait');

// Legal & Payment refs
const bankDetails = ref('');
const displayPaymentQr = ref(false);
const termsAndConditions = ref('');

watch(displaySignature, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).displaySignature = val;
  }
});
watch(displaySeal, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).displaySeal = val;
  }
});
watch(sigSealPosition, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).sigSealPosition = val;
  }
});
watch(signatureSize, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).signatureSize = val;
  }
});
watch(sealSize, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).sealSize = val;
  }
});

// Branding & Legal watchers to update rawValues.value.print for live preview
watch(primaryColor, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).primaryColor = val;
  }
});
watch(accentColor, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).accentColor = val;
  }
});
watch(fontFamily, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).fontFamily = val;
  }
});
watch(pageOrientation, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).pageOrientation = val;
  }
});
watch(bankDetails, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).bankDetails = val;
  }
});
watch(displayPaymentQr, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).displayPaymentQr = val;
  }
});
watch(termsAndConditions, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).termsAndConditions = val;
  }
});
watch(customBaseStyle, (val) => {
  if (rawValues.value?.print) {
    (rawValues.value.print as any).customBaseStyle = val;
  }
});

function updateHeight() {
  if (previewContainer.value) {
    containerHeight.value = previewContainer.value.clientHeight;
  }
}

watch(
  [columns, selectedStyle, customBaseStyle, values],
  () => {
    setTimeout(updateHeight, 150);
  },
  { deep: true }
);
const unusedFields = computed(() =>
  ALL_AVAILABLE_FIELDS.filter((f) => !usedFieldnames.value.has(f.fieldname))
);
const docItems = computed(
  () => (docData.value.items as Record<string, unknown>[] | undefined) ?? []
);
const docTaxes = computed(
  () =>
    (docData.value.taxes as
      | { account: string; amount: string }[]
      | undefined) ?? []
);

// ── lifecycle ──
onMounted(async () => {
  await initialize();

  let columnsVal = DEFAULT_COLUMNS.map((c) => ({ ...c }));
  let styleVal: InvoiceStyleKey = 'Classic';
  let customBaseStyleVal: 'Classic' | 'Modern' | 'POS' = 'Classic';

  const tName = route.query.templateName as string | undefined;
  if (tName) {
    const lowerName = tName.toLowerCase();
    if (lowerName.startsWith('modern')) {
      styleVal = 'Modern';
    } else if (lowerName.startsWith('pos') || lowerName.includes('pos')) {
      styleVal = 'POS';
    } else if (lowerName.startsWith('classic')) {
      styleVal = 'Classic';
    } else if (
      lowerName.startsWith('custom') ||
      lowerName.startsWith('quote')
    ) {
      styleVal = 'Custom';
    }

    try {
      const templateDoc = await fyo.doc.getDoc(
        ModelNameEnum.PrintTemplate,
        tName
      );
      const templateContent = templateDoc.get('template') as string | undefined;
      if (templateContent) {
        const config = JSON.parse(templateContent);
        if (config.columns) columnsVal = config.columns;
        if (config.style) {
          styleVal = config.style === 'Quote' ? 'Custom' : config.style;
        }
        if (config.customBaseStyle) customBaseStyleVal = config.customBaseStyle;
      }
    } catch (err) {
      console.error('Failed to load PrintTemplate config:', err);
    }
  } else {
    const saved = await loadColumnConfig(props.schemaName);
    columnsVal = saved.columns;
    styleVal = saved.style;
    customBaseStyleVal = saved.customBaseStyle || 'Classic';
  }

  columns.value = columnsVal;
  selectedStyle.value = styleVal;
  customBaseStyle.value = customBaseStyleVal;

  // Load PrintSettings fields
  const ps = await fyo.doc.getDoc('PrintSettings');
  displaySignature.value = !!ps.get('displaySignature');
  displaySeal.value = !!ps.get('displaySeal');
  sigSealPosition.value =
    (ps.get('sigSealPosition') as string) || 'before_terms';
  signatureSize.value = Number(ps.get('signatureSize')) || 80;
  sealSize.value = Number(ps.get('sealSize')) || 50;

  // Load visual/branding values
  primaryColor.value = (ps.get('primaryColor') as string) || '#000000';
  accentColor.value = (ps.get('accentColor') as string) || '#f3f4f6';
  fontFamily.value = (ps.get('fontFamily') as string) || 'Figtree';
  pageOrientation.value = (ps.get('pageOrientation') as string) || 'portrait';

  // Load legal/payment values
  bankDetails.value = (ps.get('bankDetails') as string) || '';
  displayPaymentQr.value = !!ps.get('displayPaymentQr');
  termsAndConditions.value = (ps.get('termsAndConditions') as string) || '';

  // Synchronize initial state to rawValues for live preview
  if (rawValues.value?.print) {
    const p = rawValues.value.print as any;
    p.primaryColor = primaryColor.value;
    p.accentColor = accentColor.value;
    p.fontFamily = fontFamily.value;
    p.pageOrientation = pageOrientation.value;
    p.bankDetails = bankDetails.value;
    p.displayPaymentQr = displayPaymentQr.value;
    p.termsAndConditions = termsAndConditions.value;
    p.customBaseStyle = customBaseStyle.value;
  }

  setTimeout(updateHeight, 300);
});

// ── drag reorder ──
function onDragStart(idx: number) {
  dragging.value = idx;
}
function onDragOver(idx: number) {
  dragOverIdx = idx;
}
function onDrop() {
  if (dragging.value === null || dragging.value === dragOverIdx) return;
  const moved = columns.value.splice(dragging.value, 1)[0];
  columns.value.splice(dragOverIdx, 0, moved);
  dragging.value = null;
}

// ── actions ──
function resetColumns() {
  columns.value = DEFAULT_COLUMNS.map((c) => ({ ...c }));
}
function addField(f: ColumnDef) {
  columns.value.push({ ...f, visible: true });
}

async function save() {
  try {
    // Pass silent=true to prevent usePdfInvoice from firing the default toast
    await saveColumnConfig(
      props.schemaName,
      columns.value,
      selectedStyle.value,
      customBaseStyle.value,
      true
    );

    // Save PrintSettings fields
    const ps = await fyo.doc.getDoc('PrintSettings');
    await ps.set('displaySignature', displaySignature.value);
    await ps.set('displaySeal', displaySeal.value);
    await ps.set('sigSealPosition', sigSealPosition.value);
    await ps.set('signatureSize', Number(signatureSize.value) || 80);
    await ps.set('sealSize', Number(sealSize.value) || 50);

    // Save branding settings
    await ps.set('primaryColor', primaryColor.value);
    await ps.set('accentColor', accentColor.value);
    await ps.set('font', fontFamily.value);
    await ps.set('fontFamily', fontFamily.value);
    await ps.set('pageOrientation', pageOrientation.value);

    // Save legal/payment settings
    await ps.set('bankDetails', bankDetails.value);
    await ps.set('displayPaymentQr', displayPaymentQr.value);
    await ps.set('termsAndConditions', termsAndConditions.value);
    await ps.sync();

    const templateLabel =
      fyo.schemaMap[props.schemaName]?.label || props.schemaName;
    const templateName = `${STYLE_PRESETS[selectedStyle.value]?.label || selectedStyle.value} - ${templateLabel}`;

    // Dynamically sync PrintTemplate record for route integration
    try {
      let templateDoc;
      try {
        templateDoc = await fyo.doc.getDoc(
          ModelNameEnum.PrintTemplate,
          templateName
        );
      } catch {
        templateDoc = fyo.doc.getNewDoc(ModelNameEnum.PrintTemplate, {
          name: templateName,
          type: props.schemaName,
          isCustom: true,
        });
      }

      const configObj = {
        columns: columns.value,
        style: selectedStyle.value,
        customBaseStyle: customBaseStyle.value,
      };
      await templateDoc.set('template', JSON.stringify(configObj));
      await templateDoc.set('created', new Date());
      await templateDoc.sync();
    } catch (err) {
      console.error('Failed to sync PrintTemplate:', err);
    }

    // Show customized save layout toast with a Locate action routing to print layouts list folder
    showToast({
      message: t`Layout "${templateName}" saved`,
      type: 'success',
      actionText: t`View Layouts`,
      action() {
        routeTo(`/list/PrintTemplate`);
      },
    });
  } catch (err) {
    console.error('Save layout failed:', err);
    showToast({ message: t`Save failed`, type: 'error' });
  }
}

async function download() {
  if (!values.value) return;

  // Clone values to make sure changes are passed to PDF builder
  const pdfValues = JSON.parse(
    JSON.stringify(values.value)
  ) as PdfInvoiceValues;
  if (pdfValues.print) {
    const p = pdfValues.print as any;
    p.primaryColor = primaryColor.value;
    p.accentColor = accentColor.value;
    p.font = fontFamily.value;
    p.fontFamily = fontFamily.value;
    p.pageOrientation = pageOrientation.value;
    p.bankDetails = bankDetails.value;
    p.displayPaymentQr = displayPaymentQr.value;
    p.termsAndConditions = termsAndConditions.value;
    p.customBaseStyle = customBaseStyle.value;
  }

  await downloadInvoicePdf(
    props.name || (values.value.doc.name as string),
    pdfValues,
    columns.value,
    selectedStyle.value,
    showPageNumbers.value
  );
}

async function doPrint() {
  if (!values.value) return;

  // Clone values to make sure changes are passed to PDF builder
  const pdfValues = JSON.parse(
    JSON.stringify(values.value)
  ) as PdfInvoiceValues;
  if (pdfValues.print) {
    const p = pdfValues.print as any;
    p.primaryColor = primaryColor.value;
    p.accentColor = accentColor.value;
    p.font = fontFamily.value;
    p.fontFamily = fontFamily.value;
    p.pageOrientation = pageOrientation.value;
    p.bankDetails = bankDetails.value;
    p.displayPaymentQr = displayPaymentQr.value;
    p.termsAndConditions = termsAndConditions.value;
    p.customBaseStyle = customBaseStyle.value;
  }

  await printInvoicePdf(
    props.name || (values.value.doc.name as string),
    pdfValues,
    columns.value,
    selectedStyle.value,
    showPageNumbers.value
  );
}
</script>

<style>
/* Force text and borders inside the white invoice preview cards to be dark/black in dark mode */
html.dark .invoice-preview-card,
html.dark .invoice-preview-card td,
html.dark .invoice-preview-card p,
html.dark .invoice-preview-card span,
html.dark .invoice-preview-card div,
html.dark .invoice-preview-card th,
html.dark .invoice-preview-card table,
html.dark .invoice-preview-card h1,
html.dark .invoice-preview-card h2,
html.dark .invoice-preview-card h3,
html.dark .invoice-preview-card h4 {
  color: #000;
}

html.dark .invoice-preview-card th,
html.dark .invoice-preview-card td,
html.dark .invoice-preview-card table,
html.dark .invoice-preview-card div {
  border-color: #000;
}
</style>
