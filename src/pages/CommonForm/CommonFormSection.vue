<template>
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
        <view v-if="errors?.[field.fieldname]" class="text-sm text-error mt-1">
          {{ errors[field.fieldname] }}
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import FormControl from 'src/components/Controls/FormControl.vue';
import Table from 'src/components/Controls/Table.vue';
import { focusOrSelectFormControl } from 'src/utils/ui';

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
    title: '',
    showTitle: false,
    collapsible: true,
  }
);

// Define Emits
defineEmits<{
  (e: 'editrow', doc: Doc): void;
  (e: 'value-change', field: Field, value: DocValue): void;
  (e: 'row-change', field: Field, value: DocValue, parentfield: Field): void;
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

// Lifecycles
onMounted(() => {
  focusOrSelectFormControl(props.doc, nameField.value);
});
</script>
