<template>
  <FormContainer>
    <template #header>
      <Button v-if="canSave" type="primary" @click="sync">
        {{ t`Save` }}
      </Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="tabLabels[activeTab] ?? ''"
        :form-sub-title="t`Settings`"
        class="sticky top-0 bg-white dark:bg-gray-899 border-b dark:border-gray-800"
      >
      </FormHeader>

      <!-- Section Container -->
      <div v-if="doc" class="overflow-auto custom-scroll custom-scroll-thumb1">
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
          @value-change="onValueChange"
        />
      </div>

      <!-- Tab Bar -->
      <div
        v-if="groupedFields && groupedFields.size > 1"
        class="mt-auto px-4 pb-4 flex gap-8 border-t dark:border-gray-800 flex-shrink-0 sticky bottom-0 bg-white dark:bg-gray-890"
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="text-sm cursor-pointer"
          :class="
            key === activeTab
              ? 'text-gray-900 dark:text-gray-25 font-semibold border-t-2 border-gray-800 dark:border-gray-100'
              : 'text-gray-700 dark:text-gray-200 '
          "
          :style="{
            paddingTop: key === activeTab ? 'calc(1rem - 2px)' : '1rem',
          }"
          @click="activeTab = key"
        >
          {{ tabLabels[key] }}
        </div>
      </div>
    </template>
  </FormContainer>
</template>
<script setup lang="ts">
import Button from 'src/components/Button.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import CommonFormSection from '../CommonForm/CommonFormSection.vue';
import { useSettings } from './useSettings';
import { useApp } from 'src/composables/useApp.js';

const props = withDefaults(
  defineProps<{
    darkMode?: boolean;
  }>(),
  {
    darkMode: false,
  }
);

const { t } = useApp();

const {
  errors,
  activeTab,
  groupedFields,
  canSave,
  doc,
  tabLabels,
  activeGroup,
  sync,
  onValueChange,
} = useSettings();
</script>

