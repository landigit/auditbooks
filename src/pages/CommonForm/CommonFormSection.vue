<template>
  <div v-if="(fields ?? []).length > 0" class="mb-4">
    <div
      v-if="showTitle && title"
      class="flex justify-between items-center select-none py-3 px-4 rounded-md transition-all"
      :class="[
        collapsed ? 'bg-white/5 hover:bg-white/10' : 'mb-6',
        collapsible ? 'cursor-pointer' : '',
      ]"
      @click="toggleCollapsed"
    >
      <h2
        class="text-xs font-semibold normal-case tracking-[0.2em]"
        :class="collapsed ? 'text-foreground/70' : 'text-primary'"
      >
        {{ title }}
      </h2>
      <LucideIcon
        v-if="collapsible"
        :name="collapsed ? 'chevron-down' : 'chevron-up'"
        class="w-4 h-4 transition-all"
        :class="collapsed ? 'text-muted-foreground/50' : 'text-primary/70'"
      />
    </div>
    <div v-if="!collapsed" class="grid gap-6 gap-x-8 grid-cols-2 px-2">
      <div
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
        <div v-if="errors?.[field.fieldname]" class="text-sm text-red-600 mt-1">
          {{ errors[field.fieldname] }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import FormControl from 'src/components/Controls/FormControl.vue';
import Table from 'src/components/Controls/Table.vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import { focusOrSelectFormControl } from 'src/utils/ui';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  components: { FormControl, Table, LucideIcon },
  props: {
    title: { type: String, default: '' },
    errors: {
      type: Object as PropType<Record<string, string>>,
      required: true,
    },
    showTitle: Boolean,
    doc: { type: Object as PropType<Doc>, required: true },
    collapsible: { type: Boolean, default: true },
    fields: { type: Array as PropType<Field[]>, required: true },
  },
  emits: ['editrow', 'value-change', 'row-change'],
  data() {
    return { collapsed: false } as {
      collapsed: boolean;
    };
  },
  mounted() {
    focusOrSelectFormControl(this.doc, this.$refs.nameField);
  },
  methods: {
    tableValue(value: unknown): unknown[] {
      if (Array.isArray(value)) {
        return value;
      }

      return [];
    },
    toggleCollapsed() {
      if (!this.collapsible) {
        return;
      }

      this.collapsed = !this.collapsed;
    },
  },
});
</script>
