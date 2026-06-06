<template>
  <view>
    <PageHeader :title="t`Customize Form`">
      <DropdownWithActions :actions="[]" :disabled="false" :title="t`More`" />
      <Button :title="t`Save Customizations`" type="primary">
        {{ t`Save` }}
      </Button>
    </PageHeader>
    <view class="flex text-base w-full flex-col">
      <!-- Select Entry Type -->
      <view
        class="h-row-largest flex flex-row justify-start items-center w-full gap-2 border-b border-border p-4"
      >
        <AutoComplete
          :df="{
            fieldname: 'formType',
            label: t`Form Type`,
            fieldtype: 'AutoComplete',
            options: customizableSchemas,
          }"
          input-class="bg-transparent text-main text-base"
          class="w-40"
          :border="true"
          :value="formType"
          size="small"
          @change="setEntryType"
        />

        <text v-if="errorMessage" class="text-base ms-2 text-error">
          {{ errorMessage }}
        </text>
        <text v-else-if="helpMessage" class="text-base ms-2 text-description">
          {{ helpMessage }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import Button from 'src/components/Button.vue';
import PageHeader from 'src/components/PageHeader.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import { ModelNameEnum } from 'models/types';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

// Reactive State
const errorMessage = ref('');
const formType = ref('');

// Computed Properties
const customizableSchemas = computed(() => {
  const schemaNames = Object.keys(fyo.schemaMap).filter((schemaName) => {
    const schema = fyo.schemaMap[schemaName];
    if (!schema) {
      return false;
    }

    if (schema?.isSingle) {
      return false;
    }

    return ![
      ModelNameEnum.NumberSeries,
      ModelNameEnum.SingleValue,
      ModelNameEnum.SetupWizard,
      ModelNameEnum.PatchRun,
    ].includes(schemaName as ModelNameEnum);
  });

  return schemaNames.map((sn) => ({
    value: sn,
    label: fyo.schemaMap[sn]?.label ?? sn,
  }));
});

const helpMessage = computed(() => {
  if (!formType.value) {
    return t`Select a form type to customize`;
  }
  return '';
});

// Methods
const setEntryType = (type: string) => {
  formType.value = type;
};
</script>
