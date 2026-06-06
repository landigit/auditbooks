<template>
  <view
    class="border-s border-border h-full overflow-auto w-quick-edit bg-surface custom-scroll custom-scroll-thumb2"
  >
    <!-- Row Edit Tool bar -->
    <view
      class="sticky top-0 border-b border-border bg-surface"
      style="z-index: 1"
    >
      <view class="flex items-center justify-between px-4 h-row-largest">
        <!-- Close Button -->
        <Button :icon="true" @tap="emit('close')">
          <lucide-icon name="x" class="w-4 h-4" />
        </Button>

        <!-- Actions, Badge and Status Change Buttons -->
        <view class="flex items-stretch gap-2">
          <Button
            v-if="previous >= 0"
            :icon="true"
            @tap="emit('previous', previous)"
          >
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
</template>

<script setup lang="ts">
import { computed, inject, provide, onMounted, onUnmounted } from 'vue';
import { Doc } from 'fyo/model/doc';
import { ValueError } from 'fyo/utils/errors';
import Button from 'src/components/Button.vue';
import FormHeader from 'src/components/FormHeader.vue';
import TwoColumnForm from 'src/components/TwoColumnForm.vue';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

const COMPONENT_NAME = 'RowEditForm';

// Define Props
const props = defineProps<{
  doc: Doc;
  index: number;
  fieldname: string;
}>();

// Define Emits
const emit = defineEmits<{
  (e: 'next', nextIndex: number): void;
  (e: 'previous', prevIndex: number): void;
  (e: 'close'): void;
}>();

// Inject Shortcuts
const shortcuts = inject(shortcutsKey);

// Computed Properties
const fieldlabel = computed(() => {
  return fyo.getField(props.doc.schemaName, props.fieldname)?.label ?? '';
});

const row = computed(() => {
  const rows = props.doc.get(props.fieldname);
  if (Array.isArray(rows) && rows[props.index] instanceof Doc) {
    return rows[props.index];
  }

  const label = `${props.doc.name ?? '_name'}.${props.fieldname}[${props.index}]`;
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

// Provide document context to child elements
provide('doc', row);

// Lifecycles
onMounted(() => {
  shortcuts?.set(COMPONENT_NAME, ['Escape'], () => emit('close'));
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});
</script>
