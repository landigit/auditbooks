<template>
  <div v-if="(fields ?? []).length > 0">
    <div
      v-if="showTitle && title"
      class="flex justify-between items-center select-none"
      :class="[collapsed ? '' : 'mb-4', collapsible ? 'cursor-pointer' : '']"
      @click="toggleCollapsed"
    >
      <h2 class="text-base text-foreground font-semibold">
        {{ title }}
      </h2>
      <feather-icon
        v-if="collapsible"
        :name="collapsed ? 'chevron-up' : 'chevron-down'"
        class="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors duration-150"
      />
    </div>
    <div v-if="!collapsed" class="grid gap-4 gap-x-8 grid-cols-1 md:grid-cols-2">
      <div
        v-for="(field, idx) of fields"
        :key="field.fieldname"
        :class="[
          field.fieldtype === 'Table' ? 'col-span-2 text-base' : '',
          field.fieldtype === 'AttachImage' ? 'row-span-2' : '',
          field.fieldname === 'termsAndConditions' ? 'col-span-2' : '',
          field.invisible ? 'invisible' : '',
        ]"
        :style="field.invisible ? 'visibility: hidden;' : ''"
      >
        <Table
          v-if="field.fieldtype === 'Table'"
          ref="fields"
          :show-label="!isDuplicateLabel(field)"
          :border="true"
          :df="field"
          :value="tableValue(doc[field.fieldname])"
          @editrow="(doc: Doc) => $emit('editrow', doc)"
          @change="(value: DocValue) => $emit('value-change', field, value)"
          @row-change="(field:Field, value:DocValue, parentfield:Field) => $emit('row-change',field, value, parentfield)"
        />
        <FormControl
          v-else
          :ref="field.fieldname === 'name' ? 'nameField' : 'fields'"
          :size="field.fieldtype === 'AttachImage' ? 'form' : undefined"
          :show-label="!isDuplicateLabel(field)"
          :border="true"
          :df="field"
          :value="doc[field.fieldname]"
          :align-with-inputs="shouldAlignWithInputs(idx)"
          @editrow="(doc: Doc) => $emit('editrow', doc)"
          @change="(value: DocValue) => $emit('value-change', field, value)"
          @row-change="(field:Field, value:DocValue, parentfield:Field) => $emit('row-change',field, value, parentfield)"
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
import { focusOrSelectFormControl } from 'src/utils/ui';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  components: { FormControl, Table },
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
  computed: {
    hasMixedFields(): boolean {
      return (this.fields ?? []).some(
        (f) => f.fieldtype !== 'Check' && f.fieldtype !== 'Table' && !f.hidden
      );
    },
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
    shouldAlignWithInputs(idx: number): boolean {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      const sibling = (this.fields ?? [])[siblingIdx];
      return !!(
        sibling &&
        sibling.fieldtype !== 'Check' &&
        sibling.fieldtype !== 'Table' &&
        !sibling.hidden
      );
    },
    isDuplicateLabel(field: Field): boolean {
      if (!this.showTitle || !this.title || !field || !field.label) {
        return false;
      }
      const cleanTitle = this.title.toLowerCase().trim();
      const cleanLabel = field.label.toLowerCase().trim();

      const getRootWord = (word: string) => {
        let w = word.toLowerCase().trim();
        if (w.endsWith('ies')) {
          return w.slice(0, -3) + 'y';
        }
        if (w.endsWith('es')) {
          return w.slice(0, -2);
        }
        if (w.endsWith('s') && w.length > 3) {
          return w.slice(0, -1);
        }
        return w;
      };

      const cleanTitleRoot = getRootWord(cleanTitle);
      const cleanLabelRoot = getRootWord(cleanLabel);

      if (cleanTitleRoot === cleanLabelRoot) {
        return true;
      }

      if (field.fieldtype === 'Table') {
        const stopwords = new Set(['and', 'or', 'of', 'the', 'for', 'in', 'to', 'with', 'by']);
        const titleWords = cleanTitle.split(/[^a-zA-Z0-9]+/).map(getRootWord).filter(w => w && !stopwords.has(w));
        const labelWords = cleanLabel.split(/[^a-zA-Z0-9]+/).map(getRootWord).filter(w => w && !stopwords.has(w));

        const hasOverlap = titleWords.some(tw => labelWords.includes(tw));
        if (hasOverlap) {
          return true;
        }
      }

      return false;
    },
  },
});
</script>
