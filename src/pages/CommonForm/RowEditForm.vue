<template>
  <div
    class="bg-white dark:bg-gray-890 custom-scroll custom-scroll-thumb2"
    :class="isMobile ? 'w-full h-full fixed inset-0 z-50' : 'border-s dark:border-gray-800 h-full overflow-auto w-quick-edit'"
  >
    <!-- Row Edit Tool bar -->
    <div
      class="sticky top-0 border-b dark:border-gray-800 bg-white dark:bg-gray-890"
      style="z-index: 1"
    >
      <div class="flex items-center justify-between px-4 h-row-largest">
        <!-- Close Button -->
        <Button :icon="true" @click="$emit('close')">
          <feather-icon name="x" class="w-4 h-4" />
        </Button>

        <!-- Actions, Badge and Status Change Buttons -->
        <div class="flex items-stretch gap-2">
          <Button
            v-if="previous >= 0"
            :icon="true"
            @click="$emit('previous', previous)"
          >
            <feather-icon name="chevron-left" class="w-4 h-4" />
          </Button>
          <Button v-if="next >= 0" :icon="true" @click="$emit('next', next)">
            <feather-icon name="chevron-right" class="w-4 h-4" />
          </Button>
        </div>
      </div>
      <FormHeader
        class="border-t dark:border-gray-800"
        :form-title="t`Row ${index + 1}`"
        :form-sub-title="fieldlabel"
      />
    </div>
    <TwoColumnForm
      ref="form"
      class="w-full"
      :doc="row"
      :fields="fields"
      :column-ratio="[1.1, 2]"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, provide } from 'vue';
import { Doc } from 'fyo/model/doc';
import { ValueError } from 'fyo/utils/errors';
import Button from 'src/components/Button.vue';
import FormHeader from 'src/components/FormHeader.vue';
import TwoColumnForm from 'src/components/TwoColumnForm.vue';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useApp } from 'src/composables/useApp';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const COMPONENT_NAME = 'RowEditForm';

const props = defineProps<{
  doc: Doc;
  index: number;
  fieldname: string;
}>();

const emit = defineEmits<{
  (e: 'previous', idx: number): void;
  (e: 'next', idx: number): void;
  (e: 'close'): void;
}>();

const { fyo, t } = useApp();
const shortcuts = useShortcuts();
const { isMobile } = useBreakpoint();

const fieldlabel = computed(() => {
  return fyo.getField(props.doc.schemaName, props.fieldname)?.label ?? '';
});

const row = computed(() => {
  const rows = props.doc.get(props.fieldname);
  if (Array.isArray(rows) && rows[props.index] instanceof Doc) {
    return rows[props.index] as Doc;
  }

  const label = `${props.doc.name ?? '_name'}.${props.fieldname}[${props.index}]`;
  throw new ValueError(t`Invalid value found for ${label}`);
});

provide('doc', computed(() => row.value));

const fields = computed(() => {
  const fieldnames = row.value.schema.quickEditFields ?? [];
  return fieldnames.map((f) => fyo.getField(row.value.schemaName, f));
});

const previous = computed<number>(() => {
  return props.index - 1;
});

const next = computed(() => {
  const rows = props.doc.get(props.fieldname);
  if (!Array.isArray(rows)) {
    return -1;
  }
  if (rows.length - 1 === props.index) {
    return -1;
  }
  return props.index + 1;
});

onMounted(() => {
  shortcuts?.set(COMPONENT_NAME, ['Escape'], () => emit('close'));
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});
</script>

