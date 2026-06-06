<template>
  <view v-if="!isLynx">
    <view v-if="(fields ?? []).length > 0">
      <view
        v-if="showTitle && title"
        class="flex justify-between items-center select-none"
        :class="[collapsed ? '' : 'mb-4', collapsible ? 'cursor-pointer' : '']"
        @tap="toggleCollapsed"
      >
        <text class="text-base text-main font-semibold">
          {{ title }}
        </text>
        <lucide-icon
          v-if="collapsible"
          :name="collapsed ? 'chevron-up' : 'chevron-down'"
          class="w-4 h-4 text-description"
        />
      </view>
      <view
        v-if="!collapsed"
        class="grid gap-4 gap-x-8 grid-cols-1 md:grid-cols-2"
      >
        <view
          v-for="field of fields"
          :key="field.fieldname"
          :class="[
            field.fieldtype === 'Table' ? 'col-span-2 text-base' : '',
            field.fieldtype === 'AttachImage' ? 'row-span-2' : '',
            field.fieldtype === 'Check' ? 'mt-auto' : 'mb-auto',
            field.fieldname === 'termsAndConditions' ? 'col-span-2' : '',
            field.invisible ? 'invisible' : '',
          ]"
          :style="field.invisible ? 'visibility: hidden;' : ''"
        >
          <Table
            v-if="field.fieldtype === 'Table'"
            ref="fields"
            :show-label="true"
            :border="true"
            :df="field"
            :value="tableValue(doc[field.fieldname])"
            @editrow="(doc: Doc) => $emit('editrow', doc)"
            @change="(value: DocValue) => $emit('value-change', field, value)"
            @row-change="
              (field: Field, value: DocValue, parentfield: Field) =>
                $emit('row-change', field, value, parentfield)
            "
          />
          <FormControl
            v-else
            :ref="field.fieldname === 'name' ? 'nameField' : 'fields'"
            :size="field.fieldtype === 'AttachImage' ? 'form' : undefined"
            :show-label="true"
            :border="true"
            :df="field"
            :value="doc[field.fieldname]"
            @editrow="(doc: Doc) => $emit('editrow', doc)"
            @change="(value: DocValue) => $emit('value-change', field, value)"
            @row-change="
              (field: Field, value: DocValue, parentfield: Field) =>
                $emit('row-change', field, value, parentfield)
            "
          />
          <view
            v-if="errors?.[field.fieldname]"
            class="text-sm text-error mt-1"
          >
            {{ errors[field.fieldname] }}
          </view>
        </view>
      </view>
    </view>
  </view>
  <view v-else class="flex flex-col mb-4">
    <!-- Section Title (if any) -->
    <view v-if="showTitle && title" class="mb-2">
      <text class="text-base text-main font-semibold">{{ title }}</text>
    </view>
    <!-- Fields list -->
    <view class="flex flex-col gap-4">
      <view
        v-for="field of fields"
        :key="field.fieldname"
        class="flex flex-col"
      >
        <!-- If it's a Table fieldtype (e.g. Sales Invoice Items) -->
        <view v-if="field.fieldtype === 'Table'" class="flex flex-col">
          <text class="text-description text-sm mb-2 font-semibold">{{
            field.label
          }}</text>
          <!-- Table Row items rendered as custom card list with delete/add -->
          <view
            v-for="(rowItem, idx) in tableValue(doc[field.fieldname])"
            :key="idx"
            class="p-3 bg-surface border border-border rounded-lg mb-2 flex flex-row justify-between items-center"
            @tap="$emit('editrow', rowItem)"
          >
            <view class="flex flex-col">
              <text class="text-sm font-medium text-main">{{
                (rowItem as any).item ||
                (rowItem as any).account ||
                `Row ${idx + 1}`
              }}</text>
              <text class="text-xs text-description">
                Qty: {{ (rowItem as any).quantity ?? 1 }} | Rate:
                {{ (rowItem as any).rate ?? "0.00" }}
              </text>
            </view>
            <text class="font-bold text-main">{{
              (rowItem as any).amount ?? ""
            }}</text>
          </view>
          <!-- Add Row button -->
          <view
            class="py-2.5 bg-blue-50 border border-dashed border-blue-300 rounded-lg flex items-center justify-center cursor-pointer"
            @tap="$emit('editrow', { parentfield: field })"
          >
            <text class="text-blue-600 text-sm font-semibold">+ Add Row</text>
          </view>
        </view>

        <!-- For regular fieldtypes (Data, Link, Currency, Select, Date, etc.) -->
        <view v-else class="flex flex-col">
          <text class="text-description text-sm mb-1">{{ field.label }}</text>
          <!-- Simple Native Input view -->
          <view
            class="px-3 py-2 bg-surface border border-border rounded-lg flex flex-row items-center"
          >
            <input
              class="flex-1 text-base text-main bg-transparent focus:outline-none"
              :value="doc[field.fieldname]"
              :placeholder="field.placeholder || field.label"
              :readonly="field.readOnly"
              @input="(e) => onNativeInput(field, e)"
            />
          </view>
          <text
            v-if="errors?.[field.fieldname]"
            class="text-xs text-error mt-1"
            >{{ errors[field.fieldname] }}</text
          >
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { isLynx } from "src/utils/interactive";
import { DocValue } from "fyo/core/types";
import { Doc } from "fyo/model/doc";
import { Field } from "schemas/types";
import FormControl from "src/components/Controls/FormControl.vue";
import Table from "src/components/Controls/Table.vue";
import { focusOrSelectFormControl } from "src/utils/ui";

// Define Props
const props = withDefaults(
  defineProps<{
    title?: string;
    errors: Record<string, string>;
    showTitle?: boolean;
    doc: Doc;
    collapsible?: boolean;
    fields: Field[];
  }>(),
  {
    title: "",
    showTitle: false,
    collapsible: true,
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "editrow", doc: any): void;
  (e: "value-change", field: Field, value: DocValue): void;
  (e: "row-change", field: Field, value: DocValue, parentfield: Field): void;
}>();

// Reactive State
const collapsed = ref(false);

// Template Ref
const nameField = ref<any>(null);

// Methods
const tableValue = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const toggleCollapsed = () => {
  if (!props.collapsible) {
    return;
  }

  collapsed.value = !collapsed.value;
};

const onNativeInput = (field: Field, e: any) => {
  const val = e.detail?.value !== undefined ? e.detail.value : e.target?.value;
  emit("value-change", field, val);
};

// Lifecycles
onMounted(() => {
  focusOrSelectFormControl(props.doc, nameField.value);
});
</script>
