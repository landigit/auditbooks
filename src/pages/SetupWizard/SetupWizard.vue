<template>
  <FormContainer
    :show-header="false"
    class="justify-content items-center h-full"
    :class="{ 'window-drag': store.platform !== 'Windows' }"
  >
    <template #body>
      <FormHeader
        :form-title="t`Set up your organization`"
        class="sticky top-0 bg-surface border-b border-border window-no-drag"
      >
      </FormHeader>

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1 window-no-drag"
      >
        <CommonFormSection
          v-for="([name, fields], idx) in activeGroup.entries()"
          :key="name + idx"
          ref="section"
          class="p-4"
          :class="
            idx !== 0 && activeGroup.size > 1 ? 'border-t border-border' : ''
          "
          :show-title="activeGroup.size > 1 && name !== t`Default`"
          :title="name"
          :fields="fields"
          :doc="doc"
          :errors="errors"
          :collapsible="false"
          @value-change="onValueChange"
        />
      </div>

      <!-- Buttons Bar -->
      <div
        class="mt-auto p-4 flex items-center justify-between border-t border-border flex-shrink-0 sticky bottom-0 bg-surface window-no-drag"
      >
        <p v-if="loading" class="text-base text-description">
          {{ t`Loading instance...` }}
        </p>
        <Button
          v-if="!loading"
          class="w-24 border border-border"
          @click="cancel"
          >{{ t`Cancel` }}</Button
        >
        <Button
          v-if="store.isDevelopment && !loading"
          class="w-24 ml-auto mr-4 border border-border"
          :disabled="loading"
          @click="fill"
          >{{ t`Fill` }}</Button
        >
        <Button
          type="primary"
          class="w-24"
          data-testid="submit-button"
          :disabled="!areAllValuesFilled || loading"
          @click="submit"
          >{{ t`Submit` }}</Button
        >
      </div>
    </template>
  </FormContainer>
</template>
<script setup lang="ts">
import { ref, computed, provide, onMounted } from 'vue';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { Verb } from 'fyo/telemetry/types';
import { TranslationString } from 'fyo/utils/translation';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';
import { getErrorMessage } from 'src/utils/api/index.js';
import { showDialog } from 'src/utils/api/interactive.js';
import { getSetupWizardDoc } from 'src/utils/api/misc.js';
import { getFieldsGroupedByTabAndSection } from 'src/utils/api/ui.js';
import { useAppStore } from 'src/stores/app';
import { SetupWizardOptions } from 'src/setup/types';
import { SetupWizard } from 'models/baseModels/SetupWizard/SetupWizard';
import Button from 'src/components/Button.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import CommonFormSection from '../CommonForm/CommonFormSection.vue';

// Define Emits
const emit = defineEmits<{
  (e: 'setup-complete', values: SetupWizardOptions): void;
  (e: 'setup-canceled'): void;
}>();

// State definition
const store = useAppStore();
const docOrNull = ref<Doc | null>(null);
const errors = ref<Record<string, string>>({});
const loading = ref(false);

// Provide 'doc' down to child components
provide(
  'doc',
  computed(() => docOrNull.value)
);

// Computed Properties
const hasDoc = computed(() => docOrNull.value instanceof Doc);

const doc = computed(() => {
  if (docOrNull.value instanceof Doc) {
    return docOrNull.value;
  }
  throw new Error(`Doc is null`);
});

const areAllValuesFilled = computed(() => {
  if (!hasDoc.value) {
    return false;
  }
  const values = doc.value.schema.fields
    .filter((f) => f.required)
    .map((f) => doc.value[f.fieldname]);

  return values.every(Boolean);
});

const activeGroup = computed(() => {
  if (!hasDoc.value) {
    return new Map<string, Field[]>();
  }
  const groupedFields = getFieldsGroupedByTabAndSection(
    doc.value.schema,
    doc.value
  );
  return [...groupedFields.values()][0];
});

// Methods
const fill = async () => {
  if (!hasDoc.value) {
    return;
  }
  await doc.value.set('companyName', "Lin's Things");
  await doc.value.set('email', 'lin@lthings.com');
  await doc.value.set('fullname', 'Lin Slovenly');
  await doc.value.set('bankName', 'Max Finance');
  await doc.value.set('country', 'India');
  await doc.value.set('currency', 'INR');
  await doc.value.set('chartOfAccounts', 'India - Chart of Accounts');
};

const onValueChange = async (field: Field, value: DocValue) => {
  if (!hasDoc.value) {
    return;
  }
  const { fieldname } = field;
  delete errors.value[fieldname];

  try {
    await doc.value.set(fieldname, value);
  } catch (err) {
    if (!(err instanceof Error)) {
      return;
    }
    errors.value[fieldname] = getErrorMessage(err, doc.value);
  }
};

const submit = async () => {
  if (!hasDoc.value) {
    return;
  }
  if (!areAllValuesFilled.value) {
    return await showDialog({
      title: t`Mandatory Error`,
      detail: t`Please fill all values.`,
      type: 'error',
    });
  }

  loading.value = true;
  fyo.telemetry.log(Verb.Completed, ModelNameEnum.SetupWizard);
  emit(
    'setup-complete',
    doc.value.getValidDict() as unknown as SetupWizardOptions
  );
};

const cancel = () => {
  fyo.telemetry.log(Verb.Cancelled, ModelNameEnum.SetupWizard);
  emit('setup-canceled');
};

// Lifecycle hooks
onMounted(async () => {
  const languageMap = TranslationString.prototype.languageMap;
  docOrNull.value = getSetupWizardDoc(languageMap);
  if (!fyo.db.isConnected) {
    await fyo.db.init();
  }
  // Register SetupWizard in doc handler models since db.init() clears it
  fyo.doc.models['SetupWizard'] = SetupWizard;

  if (store.isDevelopment) {
    // @ts-expect-error
    window.sw = {
      docOrNull,
      errors,
      loading,
      hasDoc,
      doc,
      areAllValuesFilled,
      activeGroup,
      fill,
      onValueChange,
      submit,
      cancel,
    };
  }
  fyo.telemetry.log(Verb.Started, ModelNameEnum.SetupWizard);
});
</script>
