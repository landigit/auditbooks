<template>
  <view v-if="!isLynx">
    <view
      class="border-s border-border h-full overflow-auto w-quick-edit bg-surface"
    >
      <!-- Quick edit Tool bar -->
      <view
        class="flex items-center justify-between px-4 h-row-largest sticky top-0 bg-surface"
        style="z-index: 1"
      >
        <!-- Close Button  -->
        <Button :icon="true" @tap="routeToPrevious">
          <LucideIcon name="x" class="w-4 h-4" />
        </Button>

        <!-- Save & Submit Buttons -->
        <Button v-if="doc?.canSave" :icon="true" type="primary" @tap="sync">
          {{ t`Save` }}
        </Button>
        <Button
          v-else-if="doc?.canSubmit"
          :icon="true"
          type="primary"
          @tap="submit"
        >
          {{ t`Submit` }}
        </Button>
      </view>

      <!-- Name and image -->
      <view
        v-if="doc && (titleField || imageField)"
        class="items-center border-b border-t border-border"
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
      </view>

      <!-- Rest of the form -->
      <TwoColumnForm
        v-if="doc"
        ref="form"
        class="w-full"
        :doc="doc"
        :fields="fields"
        :column-ratio="[1.1, 2]"
      />
    </view>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Quick Edit Form</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed, inject, provide, onActivated, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DocValue } from 'fyo/core/types';
import { Field, Schema } from 'schemas/types';
import Button from 'src/components/Button.vue';
import AttachImage from 'src/components/Controls/AttachImage.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import TwoColumnForm from 'src/components/TwoColumnForm.vue';
import { fyo } from 'src/initFyo';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { DocRef } from 'src/utils/types';
import {
  commonDocSubmit,
  commonDocSync,
  focusOrSelectFormControl,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { useAppStore } from 'src/stores/app';

// Define Props
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

// Define Emits
defineEmits<{
  (e: 'close'): void;
}>();

// State definition
const doc = ref(null) as DocRef;
const titleField = ref<Field | null>(null);
const imageField = ref<Field | null>(null);

// Template Refs
const form = ref<InstanceType<typeof TwoColumnForm> | null>(null);
const titleControl = ref<InstanceType<typeof FormControl> | null>(null);

// Stores & Router
const store = useAppStore();
const router = useRouter();

// Provide document context to child elements
provide(
  'doc',
  computed(() => doc.value)
);

// Shortcuts Injection
const shortcuts = inject(shortcutsKey);
let context = 'QuickEditForm';
if (shortcuts) {
  context = useDocShortcuts(shortcuts, doc, context, true);
}

// Computed Properties
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

// Methods
const setShortcuts = () => {
  shortcuts?.set(context, ['Escape'], async () => {
    await routeToPrevious();
  });
};

const setFields = () => {
  const titleFieldName = schema.value.titleField ?? 'name';
  titleField.value = fyo.getField(props.schemaName, titleFieldName) ?? null;
  imageField.value = fyo.getField(props.schemaName, 'image') ?? null;
};

const setDoc = async () => {
  try {
    doc.value = await fyo.doc.getDoc(props.schemaName, props.name);
  } catch (e) {
    router.back();
  }
};

const focusTitle = () => {
  if (doc.value && titleControl.value) {
    focusOrSelectFormControl(doc.value, titleControl.value, false);
  }
};

const initialize = async () => {
  if (!schema.value) {
    return;
  }

  setFields();
  await setDoc();
  if (!doc.value) {
    return;
  }

  focusTitle();
};

const valueChange = (field: Field, value: DocValue) => {
  form.value?.onChange(field, value);
};

const sync = async () => {
  if (!doc.value) {
    return;
  }

  await commonDocSync(doc.value);
};

const submit = async () => {
  if (!doc.value) {
    return;
  }

  await commonDocSubmit(doc.value);
};

const routeToPrevious = async () => {
  if (doc.value?.dirty && doc.value?.inserted) {
    await doc.value.load();
  }

  if (doc.value && doc.value.notInserted) {
    await doc.value.delete();
  }

  router.back();
};

// Lifecycles
onActivated(() => {
  setShortcuts();
});

onMounted(async () => {
  await initialize();

  if (typeof window !== 'undefined' && store.isDevelopment) {
    // @ts-expect-error
    window.qef = {
      doc,
      titleField,
      imageField,
      fields,
      schema,
    };
  }

  setShortcuts();
});
</script>
