<template>
  <FormContainer
    :show-header="false"
    class="justify-content items-center h-full"
    :class="{ 'window-drag': platformName !== 'Windows' }"
  >
    <template #body>
      <FormHeader
        :form-title="t`Set up your organization`"
        class="sticky top-0 bg-white dark:bg-gray-890 border-b dark:border-gray-800"
      >
      </FormHeader>

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
      >
        <CommonFormSection
          v-for="([name, fields], idx) in activeGroup.entries()"
          :key="name + idx"
          ref="section"
          class="p-4"
          :class="
            idx !== 0 && activeGroup.size > 1
              ? 'border-t dark:border-gray-800'
              : ''
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
        class="mt-auto p-4 flex items-center justify-between border-t dark:border-gray-800 flex-shrink-0 sticky bottom-0 bg-white dark:bg-gray-890"
      >
        <p v-if="loading" class="text-base text-gray-600 dark:text-gray-400">
          {{ t`Loading instance...` }}
        </p>
        <Button
          v-if="!loading"
          class="w-24 border dark:border-gray-800"
          @click="cancel"
          >{{ t`Cancel` }}</Button
        >
        <Button
          v-if="!loading"
          class="w-24 ml-auto mr-4 border dark:border-gray-800"
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
import { ref, computed, onMounted, provide } from 'vue';
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { Verb } from 'fyo/telemetry/types';
import { TranslationString } from 'fyo/utils/translation';
import { ModelNameEnum } from 'models/types';
import { Field } from 'schemas/types';
import Button from 'src/components/Button.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import CommonFormSection from 'src/pages/CommonForm/CommonFormSection.vue';
import { getErrorMessage } from 'src/utils';
import { showDialog } from 'src/utils/interactive';
import { getSetupWizardDoc } from 'src/utils/misc';
import { getFieldsGroupedByTabAndSection } from 'src/utils/ui';
import { useApp } from 'src/composables/useApp';
import { usePlatform } from 'src/composables/usePlatform';

const emit = defineEmits(['setup-complete', 'setup-canceled']);

const { t, fyo } = useApp();
const { platformName } = usePlatform();

const docOrNull = ref<null | Doc>(null);
const errors = ref<Record<string, string>>({});
const loading = ref(false);

provide(
  'doc',
  computed(() => docOrNull.value)
);

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

onMounted(async () => {
  const languageMap = TranslationString.prototype.languageMap;
  docOrNull.value = getSetupWizardDoc(languageMap);
  if (!fyo.db.isConnected) {
    await fyo.db.init();
  }

  // @ts-ignore
  window.sw = {
    docOrNull,
    errors,
    loading,
    hasDoc,
    doc,
    areAllValuesFilled,
    activeGroup,
    fill,
    submit,
    cancel,
  };
  fyo.telemetry.log(Verb.Started, ModelNameEnum.SetupWizard);
});

async function fill() {
  if (!hasDoc.value) {
    return;
  }

  await doc.value.set('companyName', "Lin's Things");
  await doc.value.set('email', 'lin@lthings.com');
  await doc.value.set('fullname', 'Lin Slovenly');
  await doc.value.set('bankName', 'Max Finance');
  await doc.value.set('country', 'India');
}

async function onValueChange(field: Field, value: DocValue) {
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
}

async function submit() {
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
  emit('setup-complete', doc.value.getValidDict());
}

function cancel() {
  fyo.telemetry.log(Verb.Cancelled, ModelNameEnum.SetupWizard);
  emit('setup-canceled');
}
</script>
