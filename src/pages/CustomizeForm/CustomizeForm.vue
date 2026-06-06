<template>
  <view v-if="!isLynx">
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
  </view>
  <view v-else class="MainView">
    <view class="NavBar">
      <view class="BackBtn" @tap="router.back()">
        <text class="BackBtnText">⬅️ Back</text>
      </view>
      <view class="NavBrand">
        <text class="BrandText">Customize Form</text>
      </view>
    </view>

    <view class="flex-1 flex flex-col p-4 bg-canvas">
      <!-- Select Entry Type -->
      <view class="mb-4">
        <text class="text-sm font-semibold text-main mb-2">Form Type</text>
        <AutoComplete
          :df="{
            fieldname: 'formType',
            label: t`Form Type`,
            fieldtype: 'AutoComplete',
            options: customizableSchemas,
          }"
          input-class="bg-transparent text-main text-base"
          class="w-full"
          :border="true"
          :value="formType"
          size="small"
          @change="setEntryType"
        />
      </view>

      <view
        v-if="errorMessage"
        class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
      >
        <text class="text-xs text-error">{{ errorMessage }}</text>
      </view>
      <view
        v-else-if="helpMessage"
        class="p-3 bg-surface border border-border rounded-lg"
      >
        <text class="text-xs text-description">{{ helpMessage }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import router from "src/router";
import { isLynx } from "src/utils/interactive";
import DropdownWithActions from "src/components/DropdownWithActions.vue";
import Button from "src/components/Button.vue";
import PageHeader from "src/components/PageHeader.vue";
import AutoComplete from "src/components/Controls/AutoComplete.vue";
import { ModelNameEnum } from "models/types";
import { fyo } from "src/initFyo";
import { t } from "fyo";

/* Reactive State */
const errorMessage = ref("");
const formType = ref("");

/* Computed Properties */
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
  return "";
});

/* Methods */
const setEntryType = (type: string) => {
  formType.value = type;
};
</script>
