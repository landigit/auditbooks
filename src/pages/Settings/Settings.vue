<template>
  <FormContainer>
    <template #header>
      <Button v-if="canSave" type="primary" @click="sync">
        <feather-icon name="save" class="w-4 h-4 me-1.5" />
        {{ t`Save` }}
      </Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="tabLabels[activeTab] ?? ''"
        :form-sub-title="t`Settings`"
        class="sticky top-0 bg-white dark:bg-gray-890 border-b dark:border-gray-800"
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
        class="settings-tabs-container"
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="settings-tab-button"
          :class="{ active: key === activeTab }"
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
