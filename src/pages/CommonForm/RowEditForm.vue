<template>
  <view v-if="!isLynx">
    <view
      class="fixed md:relative inset-y-0 end-0 z-50 border-s border-border h-full overflow-auto w-quick-edit bg-surface custom-scroll custom-scroll-thumb2"
    >
      <!-- Row Edit Tool bar -->
      <view class="sticky top-0 border-b border-border bg-surface" style="z-index: 1">
        <view class="flex items-center justify-between px-4 h-row-largest">
          <!-- Close Button -->
          <Button :icon="true" @tap="emit('close')">
            <lucide-icon name="x" class="w-4 h-4" />
          </Button>

          <!-- Actions, Badge and Status Change Buttons -->
          <view class="flex items-stretch gap-2">
            <Button v-if="previous >= 0" :icon="true" @tap="emit('previous', previous)">
              <lucide-icon name="chevron-left" class="w-4 h-4" />
            </Button>
            <Button v-if="next >= 0" :icon="true" @tap="emit('next', next)">
              <lucide-icon name="chevron-right" class="w-4 h-4" />
            </Button>
          </view>
        </view>
        <FormHeader
          class="border-t border-border"
          :form-title="t`Row ${index + 1}`"
          :form-sub-title="fieldlabel"
        />
      </view>
      <TwoColumnForm
        ref="form"
        class="w-full"
        :doc="row"
        :fields="fields"
        :column-ratio="[1.1, 2]"
      />
    </view>
  </view>
  <view v-else class="MainView">
    <!-- Navigation Bar -->
    <view class="NavBar">
      <view class="flex-row justify-between items-center w-full">
        <view class="flex-row items-center">
          <view class="BackBtn" @tap="emit('close')">
            <text class="BackBtnText">←</text>
          </view>
          <view class="NavBrand">
            <text class="BrandText">{{ t`Row ${index + 1}` }}</text>
          </view>
        </view>

        <!-- Previous / Next navigation -->
        <view class="flex-row items-center gap-2">
          <view
            v-if="previous >= 0"
            class="px-3 py-1.5 rounded bg-canvas-muted border border-border"
            @tap="emit('previous', previous)"
          >
            <text class="text-sm text-main font-medium">←</text>
          </view>
          <view
            v-if="next >= 0"
            class="px-3 py-1.5 rounded bg-canvas-muted border border-border"
            @tap="emit('next', next)"
          >
            <text class="text-sm text-main font-medium">→</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Scrollable Edit Form fields -->
    <scroll-view scroll-y="true" class="flex-1" style="height: 0; min-height: 0">
      <view class="p-4 flex-col gap-4">
        <view v-for="field of fields" :key="field.fieldname" class="flex-col">
          <text class="text-sm font-semibold text-description mb-1">{{ field.label }}</text>
          <view class="px-3 py-2.5 bg-canvas border border-border rounded-lg flex-row items-center">
            <input
              class="flex-1 text-base text-main bg-transparent focus:outline-none"
              :value="row[field.fieldname]"
              :placeholder="field.placeholder || field.label"
              :readonly="field.readOnly"
              @input="(e) => onNativeInput(field, e)"
            />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, inject, provide, onMounted, onUnmounted } from "vue";
import { Doc } from "fyo/model/doc";
import { ValueError } from "fyo/utils/errors";
import Button from "src/components/Button.vue";
import FormHeader from "src/components/FormHeader.vue";
import TwoColumnForm from "src/components/TwoColumnForm.vue";
import { shortcutsKey } from "src/utils/injectionKeys";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import { isLynx } from "src/utils/interactive";
import { Field } from "schemas/types";

const COMPONENT_NAME = "RowEditForm";

// Define Props
const props = defineProps<{
  doc: Doc;
  index: number;
  fieldname: string;
}>();

// Define Emits
const emit = defineEmits<{
  (e: "next", nextIndex: number): void;
  (e: "previous", prevIndex: number): void;
  (e: "close"): void;
}>();

// Inject Shortcuts
const shortcuts = inject(shortcutsKey);

// Computed Properties
const fieldlabel = computed(() => {
  return fyo.getField(props.doc.schemaName, props.fieldname)?.label ?? "";
});

const row = computed(() => {
  const rows = props.doc.get(props.fieldname);
  if (Array.isArray(rows) && rows[props.index] instanceof Doc) {
    return rows[props.index];
  }

  const label = `${props.doc.name ?? "_name"}.${props.fieldname}[${props.index}]`;
  throw new ValueError(t`Invalid value found for ${label}`);
});

const fields = computed(() => {
  const fieldnames = row.value.schema.quickEditFields ?? [];
  return fieldnames.map((f) => fyo.getField(row.value.schemaName, f));
});

const previous = computed<number>(() => {
  return props.index - 1;
});

const next = computed<number>(() => {
  const rows = props.doc.get(props.fieldname);
  if (!Array.isArray(rows)) {
    return -1;
  }

  if (rows.length - 1 === props.index) {
    return -1;
  }

  return props.index + 1;
});

const onNativeInput = async (field: Field, e: any) => {
  const val = e.detail?.value !== undefined ? e.detail.value : e.target?.value;
  try {
    await row.value.set(field.fieldname, val);
  } catch (err) {
    console.error("Error setting row value:", err);
  }
};

// Provide document context to child elements
provide("doc", row);

// Lifecycles
onMounted(() => {
  shortcuts?.set(COMPONENT_NAME, ["Escape"], () => emit("close"));
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});
</script>
