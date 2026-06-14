<template>
  <FormContainer :use-full-width="useFullWidth">
    <template v-if="hasDoc" #header-left>
      <Barcode
        v-if="canShowBarcode"
        class="h-8"
        @item-selected="(name:string) => {
          // @ts-ignore
          doc?.addItem(name);
        }"
      />
      <ExchangeRate
        v-if="canShowExchangeRate"
        :disabled="doc?.isSubmitted || doc?.isCancelled"
        :from-currency="fromCurrency"
        :to-currency="toCurrency"
        :exchange-rate="exchangeRate"
        @change="
          async (exchangeRate: number) =>
            await doc.set('exchangeRate', exchangeRate)
        "
      />
      <p
        v-if="schema.label && !(canShowBarcode || canShowExchangeRate)"
        class="text-xl font-semibold items-center text-foreground"
      >
        {{ schema.label }}
      </p>
    </template>
    <template v-if="hasDoc" #header>
      <Button
        v-if="canShowLinks"
        :icon="true"
        :title="t`View linked entries`"
        @click="showLinks = true"
      >
        <feather-icon name="link" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        v-if="canPrint"
        ref="printButtonRef"
        :icon="true"
        :title="t`Open Print View`"
        @click="routeTo(`/print/${doc.schemaName}/${doc.name}`)"
      >
        <feather-icon name="printer" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        :icon="true"
        class="hidden md:inline-flex"
        :title="t`Toggle between form and full width`"
        @click="toggleWidth"
      >
        <feather-icon
          :name="useFullWidth ? 'minimize' : 'maximize'"
          class="w-4 h-4"
        ></feather-icon>
      </Button>
      <DropdownWithActions
        v-for="group of groupedActions"
        :key="group.label"
        :type="group.type"
        :actions="group.actions"
      >
        <p v-if="group.group">
          {{ group.group }}
        </p>
        <feather-icon v-else name="more-horizontal" class="w-4 h-4" />
      </DropdownWithActions>
      <Button v-if="doc?.canSave" type="primary" @click="sync" :icon="isMobile">
        <feather-icon name="save" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Save` }}</span>
      </Button>
      <Button v-else-if="doc?.canSubmit" type="primary" @click="submit" :icon="isMobile">
        <feather-icon name="check-square" class="w-4 h-4 md:me-1.5" />
        <span class="hidden md:inline">{{ t`Submit` }}</span>
      </Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="title"
        class="sticky top-0 bg-white dark:bg-gray-890 border-b dark:border-gray-800"
      >
        <StatusPill v-if="hasDoc" :doc="doc" />
      </FormHeader>

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
      >
        <CommonFormSection
          v-for="([n, fields], idx) in activeGroup.entries()"
          :key="n + idx"
          ref="section"
          class="p-4"
          :class="
            idx !== 0 && activeGroup.size > 1
              ? 'border-t dark:border-gray-800'
              : ''
          "
          :show-title="activeGroup.size > 1 && n !== t`Default`"
          :title="n"
          :fields="fields"
          :doc="doc"
          :errors="errors"
          @editrow="(doc: Doc) => showRowEditForm(doc)"
          @value-change="onValueChange"
          @row-change="updateGroupedFields"
        />
      </div>

      <!-- Tab Bar -->
      <div
        v-if="groupedFields && groupedFields.size > 1"
        class="settings-tabs-container"
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="settings-tab-button"
          :class="{ active: key === activeTab }"
          @click="activeTab = key"
        >
          {{ key }}
        </div>
      </div>
    </template>
    <template #quickedit>
      <Transition name="quickedit">
        <LinkedEntries
          v-if="showLinks && canShowLinks"
          :doc="doc"
          @close="showLinks = false"
        />
      </Transition>
      <Transition name="quickedit">
        <RowEditForm
          v-if="row && !showLinks"
          :doc="doc"
          :fieldname="row.fieldname"
          :index="row.index"
          @previous="(i:number) => row!.index = i"
          @next="(i:number) => row!.index = i"
          @close="() => (row = null)"
        />
      </Transition>
    </template>
  </FormContainer>
</template>
<script setup lang="ts">
import { Doc } from 'fyo/model/doc';
import Button from 'src/components/Button.vue';
import Barcode from 'src/components/Controls/Barcode.vue';
import ExchangeRate from 'src/components/Controls/ExchangeRate.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import StatusPill from 'src/components/StatusPill.vue';
import { routeTo } from 'src/utils/ui';
import CommonFormSection from './CommonFormSection.vue';
import LinkedEntries from './LinkedEntries.vue';
import RowEditForm from './RowEditForm.vue';
import { useCommonForm } from 'src/composables/useCommonForm';
import { useApp } from 'src/composables/useApp.js';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const props = withDefaults(
  defineProps<{
    name?: string;
    schemaName?: string;
  }>(),
  {
    name: '',
    schemaName: 'SalesInvoice',
  }
);

const { t } = useApp();
const { isMobile } = useBreakpoint();

const {
  errors,
  activeTab,
  groupedFields,
  isPrintable,
  showLinks,
  useFullWidth,
  row,
  docOrNull,
  printButtonRef,
  canShowBarcode,
  canShowExchangeRate,
  exchangeRate,
  fromCurrency,
  toCurrency,
  canPrint,
  canShowLinks,
  hasDoc,
  status,
  doc,
  title,
  schema,
  activeGroup,
  groupedActions,
  toggleWidth,
  updateGroupedFields,
  sync,
  submit,
  showRowEditForm,
  onValueChange,
} = useCommonForm(props);
</script>

<style scoped>
/* Custom scoped styling overrides to style legacy form inputs/buttons to match shadcn specs */

/* Set font for all inner text/inputs */
:deep(.form-control),
:deep(input),
:deep(select),
:deep(textarea),
:deep(span),
:deep(div) {
  font-family: 'Figtree Variable', 'Inter', sans-serif !important;
}

/* Base custom input wrappers, selects, textareas, AutoComplete, and Link containers styling */
:deep(input[type="text"]:not(.bg-transparent)),
:deep(input[type="number"]:not(.bg-transparent)),
:deep(input[type="date"]:not(.bg-transparent)),
:deep(input[type="password"]:not(.bg-transparent)),
:deep(input[type="email"]:not(.bg-transparent)),
:deep(select),
:deep(textarea),
:deep(.border.rounded) {
  border-radius: 4px !important;
  border: 1.5px solid var(--border) !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  color: var(--foreground) !important;
  background-color: var(--background) !important;
  transition: border-color 0.15s, box-shadow 0.15s !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Style the AutoComplete inner input so it sits cleanly and remains transparent without its own border/padding */
:deep(.border.rounded input.bg-transparent) {
  border: none !important;
  padding: 0 !important;
  background-color: transparent !important;
  font-size: 14px !important;
  color: var(--foreground) !important;
  height: auto !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Ensure placeholder text matches shadcn style */
:deep(input::placeholder),
:deep(textarea::placeholder) {
  color: var(--muted-foreground) !important;
  opacity: 0.8 !important;
}

/* Focus outline for custom controls wrapper and standard inputs */
:deep(input:focus:not(.bg-transparent)),
:deep(select:focus),
:deep(textarea:focus),
:deep(.border.rounded:focus-within) {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent) !important;
  background-color: var(--background) !important;
}

/* Modern Label design */
:deep(.control-label),
:deep(.labelClasses) {
  font-size: 13.5px !important;
  font-weight: 400 !important;
  color: var(--foreground) !important;
  margin-bottom: 6px !important;
  display: inline-block !important;
}

/* Reset checkbox label layout */
:deep(label .control-label) {
  margin-bottom: 0 !important;
  display: inline-block !important;
}

/* Table overrides to look clean and modern */
:deep(table) {
  border-collapse: collapse !important;
  width: 100% !important;
  background-color: var(--background) !important;
}

:deep(th) {
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--muted-foreground) !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  padding: 10px 12px !important;
  border-bottom: 1px solid var(--border) !important;
  background-color: var(--muted) !important;
}

:deep(td) {
  font-size: 14px !important;
  padding: 10px 12px !important;
  border-bottom: 1px solid var(--border) !important;
}

:deep(.table-header-row) {
  color: var(--foreground) !important;
  font-weight: 600 !important;
}

/* Dropdown suggestion menus styling */
:deep(.absolute.z-10) {
  border-radius: 4px !important;
  border: 1.5px solid var(--border) !important;
  background-color: var(--popover) !important;
  color: var(--popover-foreground) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  margin-top: 4px !important;
  padding: 4px !important;
}

:deep(.absolute.z-10 li) {
  border-radius: 3px !important;
  font-size: 14px !important;
  padding: 6px 12px !important;
  color: var(--popover-foreground) !important;
}
:deep(.absolute.z-10 li:hover) {
  background-color: var(--accent) !important;
  color: var(--accent-foreground) !important;
}

/* Modals & Container styling */
:deep(.form-card-shadow:not(.w-full)),
:deep(.form-card:not(.w-full)) {
  border-radius: 0 0 6px 6px !important;
  border: 1px solid var(--border) !important;
  border-top: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02) !important;
}

:deep(.form-card-shadow.w-full),
:deep(.form-card.w-full) {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* Rounded buttons */
:deep(.btn),
:deep(button) {
  border-radius: 4px !important;
}

</style>
