<template>
  <div
    class="flex flex-col h-full bg-surface border-l border-border select-none"
  >
    <!-- Header -->
    <div
      class="p-4 border-b border-border flex justify-between items-center bg-canvas-muted"
    >
      <span class="font-semibold text-base text-main">{{
        t`Customize Template`
      }}</span>
      <button
        @click="resetToDefault"
        class="text-xs text-primary hover:underline font-medium"
      >
        {{ t`Reset Defaults` }}
      </button>
    </div>

    <!-- Scrollable Form Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
      <!-- Theme & Styling -->
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {{ t`Theme & Typography` }}
        </h3>

        <!-- Theme Color -->
        <div class="flex justify-between items-center">
          <label class="text-sm text-main font-medium">{{
            t`Accent Color`
          }}</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              v-model="schema.themeColor"
              @change="updateTemplate"
              class="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              v-model="schema.themeColor"
              @change="updateTemplate"
              class="w-20 text-xs py-1 px-1.5 border border-border rounded text-main bg-transparent text-center font-mono"
            />
          </div>
        </div>

        <!-- Fonts -->
        <div class="flex justify-between items-center">
          <label class="text-sm text-main font-medium">{{
            t`Font Family`
          }}</label>
          <select
            v-model="schema.font"
            @change="updateTemplate"
            class="text-sm py-1 px-2 border border-border rounded text-main bg-surface w-36 outline-none"
          >
            <option value="Inter">Inter (Sans)</option>
            <option value="Roboto">Roboto</option>
            <option value="Georgia">Georgia (Serif)</option>
            <option value="Courier New">Courier (Mono)</option>
          </select>
        </div>
      </div>

      <!-- Header Settings -->
      <div class="space-y-3 border-t border-border pt-4">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {{ t`Header Options` }}
        </h3>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Logo`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayLogo"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Company Name`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayCompanyName"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Company Address`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayAddress"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Company Phone`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayPhone"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Company Email`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayEmail"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>
      </div>

      <!-- Table Columns -->
      <div class="space-y-3 border-t border-border pt-4">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {{ t`Items Table Columns` }}
        </h3>

        <div class="grid grid-cols-2 gap-2 text-sm">
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="sNo"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
            />
            <span>S.No</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="description"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
              disabled
            />
            <span>Description</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="qty"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
            />
            <span>Qty</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="rate"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
            />
            <span>Rate</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="discount"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
            />
            <span>Discount</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="tax"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
            />
            <span>Tax</span>
          </label>
          <label class="flex items-center gap-2 text-main">
            <input
              type="checkbox"
              value="amount"
              v-model="schema.columns"
              @change="updateTemplate"
              class="w-4 h-4 rounded"
              disabled
            />
            <span>Amount</span>
          </label>
        </div>
      </div>

      <!-- Footer & Signature -->
      <div class="space-y-3 border-t border-border pt-4">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {{ t`Footer & Extra Details` }}
        </h3>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Taxes Summary`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayTaxes"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Terms & Conditions`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displayTerms"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>

        <!-- Custom Terms Input -->
        <div v-if="schema.displayTerms" class="space-y-1">
          <label class="text-xs text-gray-400 font-semibold uppercase">{{
            t`Custom Terms`
          }}</label>
          <textarea
            v-model="schema.customTerms"
            @input="updateTemplate"
            rows="3"
            class="w-full text-sm p-2 border border-border rounded text-main bg-transparent outline-none focus:border-primary resize-none"
            placeholder="E.g., Payment is due within 30 days."
          ></textarea>
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm text-main font-medium">{{
            t`Show Authorized Signatory`
          }}</label>
          <input
            type="checkbox"
            v-model="schema.displaySignature"
            @change="updateTemplate"
            class="w-4 h-4 rounded text-primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'; import { t } from 'fyo'; // Props &
Emits const props = defineProps<{ initialValue: string; }>(); const emit =
defineEmits<{ (e: 'change', value: string): void; }>(); // Default Schema config
const defaultSchema = { themeColor: '#4f46e5', font: 'Inter', displayLogo: true,
displayCompanyName: true, displayAddress: true, displayPhone: true,
displayEmail: true, columns: ['sNo', 'description', 'qty', 'rate', 'amount'],
displayTaxes: true, displayTerms: true, customTerms: '', displaySignature: true,
displayBankDetails: false, }; const schema = ref({ ...defaultSchema }); // Load
schema from template string if it exists in comments const
loadSchemaFromTemplate = (templateStr: string) => { const match =
templateStr.match(/<!-- SCHEMA:\s*({.*?})\s*-->/); if (match) { try { const
parsed = JSON.parse(match[1]); schema.value = { ...defaultSchema, ...parsed }; }
catch (e) { console.error('Failed to parse template schema comment:', e); } }
else { // If no schema comment is found, default it schema.value = {
...defaultSchema }; } }; // Reset to Default const resetToDefault = () => {
schema.value = { ...defaultSchema }; updateTemplate(); }; // Generate Vue
Template HTML const generateTemplateHTML = () => { const s = schema.value; const
escapeJsString = (str: string) => { return (str || '') .replace(/\\/g, '\\\\')
.replace(/'/g, "\\'") .replace(/\n/g, '\\n') .replace(/\r/g, '\\r'); }; const
escapedTerms = escapeJsString(s.customTerms); return `<!-- SCHEMA: ${JSON.stringify(s)} -->
<main
  class="w-full h-full bg-white text-gray-800 p-8 flex flex-col justify-between"
  style="font-family: ${s.font}, sans-serif; min-height: 100%;"
>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-start mb-8 border-b pb-6" style="border-color: ${s.themeColor}33">
      <div>
        <h1 class="text-3xl font-bold tracking-tight mb-2" style="color: ${s.themeColor}">{{ doc.entryLabel }}</h1>
        <div class="text-sm text-gray-500">
          <p class="font-semibold text-gray-700"># {{ doc.name }}</p>
          <p v-if="doc.date">Date: {{ doc.date }}</p>
          <p v-if="doc.dueDate">Due Date: {{ doc.dueDate }}</p>
        </div>
      </div>

      <div class="text-right">
        <!-- Logo -->
        <div v-if="${s.displayLogo} && print.logo" class="mb-2 flex justify-end">
          <img :src="print.logo" class="max-h-16 object-contain" />
        </div>
        <h2 v-if="${s.displayCompanyName} && print.companyName" class="text-xl font-bold" style="color: ${s.themeColor}">
          {{ print.companyName }}
        </h2>
        <div class="text-xs text-gray-500 mt-1 max-w-xs ml-auto">
          <p v-if="${s.displayAddress} && print.address">{{ print.address }}</p>
          <p v-if="${s.displayPhone} && print.phone">Phone: {{ print.phone }}</p>
          <p v-if="${s.displayEmail} && print.email">Email: {{ print.email }}</p>
        </div>
      </div>
    </div>

    <!-- Info Block -->
    <div class="grid grid-cols-2 gap-8 mb-8 text-sm">
      <div v-if="doc.customerName || doc.customer">
        <h3 class="font-bold text-gray-400 uppercase tracking-wider text-xs mb-1">Bill To</h3>
        <p class="font-bold text-gray-800 text-base">{{ doc.customerName || doc.customer }}</p>
        <p v-if="doc.customerAddress" class="text-gray-500 mt-1">{{ doc.customerAddress }}</p>
        <p v-if="doc.billingAddress" class="text-gray-500 mt-1">{{ doc.billingAddress }}</p>
        <p v-if="doc.gstin || doc.taxId" class="text-gray-500 mt-1">Tax ID: {{ doc.gstin || doc.taxId }}</p>
      </div>
      <div v-if="doc.shippingAddress" class="text-right">
        <h3 class="font-bold text-gray-400 uppercase tracking-wider text-xs mb-1">Ship To</h3>
        <p class="text-gray-600 whitespace-pre-line">{{ doc.shippingAddress }}</p>
      </div>
    </div>

    <!-- Items Table -->
    <table class="w-full mb-8 text-left border-collapse">
      <thead>
        <tr class="text-xs font-bold uppercase text-white" style="background-color: ${s.themeColor}">
          ${s.columns.includes('sNo') ? `<th class="p-3 first:rounded-l last:rounded-r">S.No</th>` : ''}
          ${s.columns.includes('description') ? `<th class="p-3 first:rounded-l last:rounded-r">Item & Description</th>` : ''}
          ${s.columns.includes('qty') ? `<th class="p-3 text-right first:rounded-l last:rounded-r">Qty</th>` : ''}
          ${s.columns.includes('rate') ? `<th class="p-3 text-right first:rounded-l last:rounded-r">Rate</th>` : ''}
          ${s.columns.includes('discount') ? `<th class="p-3 text-right first:rounded-l last:rounded-r">Discount</th>` : ''}
          ${s.columns.includes('tax') ? `<th class="p-3 text-right first:rounded-l last:rounded-r">Tax</th>` : ''}
          ${s.columns.includes('amount') ? `<th class="p-3 text-right first:rounded-l last:rounded-r">Amount</th>` : ''}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 text-sm">
        <tr v-for="(row, idx) in doc.items" :key="idx" class="hover:bg-gray-50">
          ${s.columns.includes('sNo') ? `<td class="p-3 text-gray-500">{{ idx + 1 }}</td>` : ''}
          ${
              s.columns.includes('description')
                ? `<td class="p-3">
            <p class="font-medium text-gray-900">{{ row.itemName || row.item }}</p>
            <p v-if="row.description" class="text-xs text-gray-500 mt-0.5">{{ row.description }}</p>
          </td>`
                : ''
            }
          ${s.columns.includes('qty') ? `<td class="p-3 text-right text-gray-600">{{ row.qty }}</td>` : ''}
          ${s.columns.includes('rate') ? `<td class="p-3 text-right text-gray-600">{{ row.rate }}</td>` : ''}
          ${s.columns.includes('discount') ? `<td class="p-3 text-right text-gray-600">{{ row.discountAmount || row.discount }}</td>` : ''}
          ${s.columns.includes('tax') ? `<td class="p-3 text-right text-gray-600">{{ row.taxAmount || row.tax }}</td>` : ''}
          ${s.columns.includes('amount') ? `<td class="p-3 text-right font-semibold text-gray-900">{{ row.amount }}</td>` : ''}
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="flex justify-end mb-8">
      <div class="w-80 text-sm">
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">Subtotal</span>
          <span class="font-medium text-gray-900">{{ doc.subTotal }}</span>
        </div>
        <div v-if="${s.displayTaxes} && doc.taxes && doc.taxes.length" v-for="tax in doc.taxes" :key="tax.name" class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">{{ tax.accountHead || 'Tax' }}</span>
          <span class="font-medium text-gray-900">{{ tax.taxAmount || tax.amount }}</span>
        </div>
        <div class="flex justify-between py-3 text-base font-bold border-b border-gray-200">
          <span style="color: ${s.themeColor}">Total</span>
          <span style="color: ${s.themeColor}">{{ doc.grandTotal || doc.amount }}</span>
        </div>
        <div v-if="doc.grandTotalInWords" class="text-xs text-gray-400 italic text-right mt-2">
          Amount in words: {{ doc.grandTotalInWords }}
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="mt-12 border-t pt-6 text-xs text-gray-500 flex justify-between items-end">
    <div class="max-w-md">
      <div v-if="${s.displayTerms} && ('${escapedTerms}' || print.termsAndConditions)">
        <h4 class="font-bold text-gray-700 mb-1">Terms & Conditions</h4>
        <p class="whitespace-pre-line">{{ '${escapedTerms}' || print.termsAndConditions }}</p>
      </div>
      <div v-if="${s.displayBankDetails}" class="mt-4">
        <h4 class="font-bold text-gray-700 mb-1">Bank Details</h4>
        <p v-if="print.bankName">Bank: {{ print.bankName }}</p>
        <p v-if="print.bankAccountNo">Account No: {{ print.bankAccountNo }}</p>
        <p v-if="print.bankIfsc">IFSC: {{ print.bankIfsc }}</p>
      </div>
    </div>

    <div v-if="${s.displaySignature}" class="text-center w-40">
      <div class="border-b border-gray-300 h-12 mb-2"></div>
      <p class="font-medium text-gray-700">Authorized Signatory</p>
    </div>
  </div>
</main>
`; }; // Emit changes const updateTemplate = () => { const html =
generateTemplateHTML(); emit('change', html); }; // Watch initial value change
(e.g. template loads) watch( () => props.initialValue, (newVal) => {
loadSchemaFromTemplate(newVal); } ); onMounted(() => {
loadSchemaFromTemplate(props.initialValue); });
</script>
