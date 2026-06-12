<template>
  <div
    class="bg-white dark:bg-gray-850"
    :class="isMobile ? 'w-full h-full fixed inset-0 z-50 overflow-auto' : 'border-s dark:border-gray-800 h-full overflow-auto w-quick-edit'"
  >
    <!-- Quick edit Tool bar -->
    <div
      class="flex items-center justify-between px-4 h-row-largest sticky top-0 bg-white dark:bg-gray-850 border-b dark:border-gray-800"
      style="z-index: 1"
    >
      <!-- Close Button  -->
      <Button :icon="true" @click="routeToPrevious">
        <feather-icon name="x" class="w-4 h-4" />
      </Button>

      <!-- Save & Submit Buttons -->
      <Button v-if="doc?.canSave" type="primary" @click="sync">
        <feather-icon name="save" class="w-4 h-4 me-1.5" />
        {{ t`Save` }}
      </Button>
      <Button
        v-else-if="doc?.canSubmit"
        type="primary"
        @click="submit"
      >
        <feather-icon name="check-square" class="w-4 h-4 me-1.5" />
        {{ t`Submit` }}
      </Button>
    </div>

    <!-- Name and image -->
    <div
      v-if="doc && (titleField || imageField)"
      class="items-center border-b dark:border-gray-800"
      :class="imageField ? 'grid' : 'flex justify-center'"
      :style="{
        height: `calc(var(--h-row-mid) * ${!!imageField ? '2 + 1px' : '1'})`,
        gridTemplateColumns: `minmax(0, 1.1fr) minmax(0, 2fr)`,
      }"
    >
      <AttachImage
        v-if="imageField"
        class="ms-4"
        :df="imageField"
        :value="String(doc[imageField.fieldname] ?? '')"
        :letter-placeholder="letterPlaceHolder"
        @change="(value) => valueChange(imageField as Field, value)"
      />
      <FormControl
        v-if="titleField"
        ref="titleControl"
        :class="!!imageField ? 'me-4' : 'w-full mx-4'"
        :input-class="[
          'font-semibold text-xl',
          !!imageField ? '' : 'text-center',
        ]"
        size="small"
        :df="titleField"
        :value="doc[titleField.fieldname]"
        :read-only="doc.inserted || doc.schema.naming !== 'manual'"
        @change="(value) => valueChange(titleField as Field, value)"
      />
    </div>

    <!-- Rest of the form -->
    <TwoColumnForm
      v-if="doc"
      ref="form"
      class="w-full"
      :doc="doc"
      :fields="fields"
      :column-ratio="[1.1, 2]"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Field, Schema } from 'schemas/types';
import Button from 'src/components/Button.vue';
import AttachImage from 'src/components/Controls/AttachImage.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import TwoColumnForm from 'src/components/TwoColumnForm.vue';
import { fyo } from 'src/initFyo';
import { DocRef } from 'src/utils/types';
import {
  commonDocSubmit,
  commonDocSync,
  focusOrSelectFormControl,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { useShortcuts } from 'src/composables/useShortcuts';
import { useApp } from 'src/composables/useApp';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const COMPONENT_NAME = 'QuickEditForm';

const props = withDefaults(
  defineProps<{
    name: string;
    schemaName: string;
    hideFields?: string[];
    showFields?: string[];
  }>(),
  {
    hideFields: () => [],
    showFields: () => [],
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const router = useRouter();
const { t } = useApp();
const shortcuts = useShortcuts();
const { isMobile } = useBreakpoint();

const doc = ref(null) as DocRef;
const form = ref<InstanceType<typeof TwoColumnForm> | null>(null);
const titleControl = ref<any>(null);

let context = 'QuickEditForm';
if (shortcuts) {
  context = useDocShortcuts(shortcuts, doc, context, true);
}

provide('doc', computed(() => doc.value));

const titleField = ref<null | Field>(null);
const imageField = ref<null | Field>(null);

const letterPlaceHolder = computed(() => {
  if (!doc.value) {
    return '';
  }
  const fn = titleField.value?.fieldname ?? 'name';
  const value = doc.value.get(fn);
  if (typeof value === 'string') {
    return value[0];
  }
  return '';
});

const schema = computed<Schema>(() => {
  return fyo.schemaMap[props.schemaName]!;
});

const fields = computed(() => {
  if (!schema.value) {
    return [];
  }

  const fieldnames = (schema.value.quickEditFields ?? ['name']).filter(
    (f) => !props.hideFields.includes(f)
  );

  if (props.showFields?.length) {
    fieldnames.push(
      ...schema.value.fields
        .map((f) => f.fieldname)
        .filter((f) => props.showFields.includes(f))
    );
  }

  return fieldnames.map((f) => fyo.getField(props.schemaName, f));
});

function setShortcuts() {
  shortcuts?.set(context, ['Escape'], async () => {
    await routeToPrevious();
  });
}

function setFields() {
  const titleFieldName = schema.value.titleField ?? 'name';
  titleField.value = fyo.getField(props.schemaName, titleFieldName) ?? null;
  imageField.value = fyo.getField(props.schemaName, 'image') ?? null;
}

async function setDoc() {
  try {
    doc.value = await fyo.doc.getDoc(props.schemaName, props.name);
  } catch (e) {
    return router.back();
  }
}

function valueChange(field: Field, value: DocValue) {
  form.value?.onChange(field, value);
}

async function sync() {
  if (!doc.value) {
    return;
  }
  await commonDocSync(doc.value);
}

async function submit() {
  if (!doc.value) {
    return;
  }
  await commonDocSubmit(doc.value);
}

async function routeToPrevious() {
  if (doc.value?.dirty && doc.value?.inserted) {
    await doc.value.load();
  }

  if (doc.value && doc.value.notInserted) {
    await doc.value.delete();
  }

  router.back();
}

async function initialize() {
  if (!schema.value) {
    return;
  }

  setFields();
  await setDoc();
  if (!doc.value) {
    return;
  }

  focusOrSelectFormControl(doc.value, titleControl.value, false);
}

onMounted(async () => {
  await initialize();
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.qef = {
      form,
      doc,
      titleField,
      imageField,
    };
  }
  setShortcuts();
});

onUnmounted(() => {
  shortcuts?.delete(context);
});
</script>

