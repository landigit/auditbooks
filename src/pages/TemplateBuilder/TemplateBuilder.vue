<template>
  <div>
    <PageHeader :title="doc && doc.inserted ? doc.name : ''">
      <!-- Template Name -->
      <template v-if="doc && !doc.inserted" #left>
        <FormControl
          ref="nameField"
          class="w-60 flex-shrink-0"
          size="small"
          :input-class="['font-semibold text-xl']"
          :df="fields.name"
          :border="true"
          :value="doc!.name"
          @change="async (value) => await doc?.set('name', value)"
        />
      </template>
      <Button v-if="displayDoc && doc?.template" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button v-if="displayDoc && doc?.template" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
      <Button
        v-if="doc && doc.isCustom && displayDoc"
        :title="t`Toggle Edit Mode`"
        :icon="true"
        @click="toggleEditMode"
      >
        <feather-icon name="edit" class="w-4 h-4" />
      </Button>
      <DropdownWithActions v-if="actions.length" :actions="actions" />
      <Button v-if="doc?.canSave" type="primary" @click="sync()">
        {{ t`Save` }}
      </Button>
    </PageHeader>

    <!-- Template Builder Body -->
    <div
      v-if="doc"
      class="w-full bg-gray-50 dark:bg-gray-875 grid"
      :style="templateBuilderBodyStyles"
    >
      <!-- Template Display Area -->
      <div
        class="overflow-auto no-scrollbar flex flex-col"
        :style="templateDisplayStyles"
      >
        <!-- Template Container -->
        <div
          v-if="canDisplayPreview"
          class="p-4 overflow-auto custom-scroll custom-scroll-thumb1"
        >
          <PrintContainer
            ref="printContainer"
            :print-schema-name="displayDoc!.schemaName"
            :template="doc.template!"
            :values="values!"
            :scale="scale"
            :height="doc.height"
            :width="doc.width"
          />
        </div>

        <!-- Display Hints -->
        <p
          v-else-if="helperMessage"
          class="text-sm text-gray-700 dark:text-gray-300 p-4"
        >
          {{ helperMessage }}
        </p>

        <!-- Bottom Bar -->
        <div
          class="w-full sticky bottom-0 flex bg-white dark:bg-gray-890 border-t dark:border-gray-800 mt-auto flex-shrink-0"
        >
          <!-- Entry Type -->
          <FormControl
            :title="fields.type.label"
            class="w-40 border-r dark:border-gray-800 flex-shrink-0"
            :df="fields.type"
            :border="false"
            :value="doc.get('type')"
            :container-styles="{ 'border-radius': '0px' }"
            @change="async (value) => await setType(value)"
          />
          <Link
            v-if="doc.type"
            :title="displayDocField.label"
            class="w-40 border-r dark:border-gray-800 flex-shrink-0"
            :df="displayDocField"
            :border="false"
            :value="displayDoc?.name"
            :container-styles="{ 'border-radius': '0px' }"
            @change="(value: string) => setDisplayDoc(value)"
          />

          <!-- Display Scale -->
          <div
            v-if="canDisplayPreview"
            class="flex ml-auto gap-2 px-2 w-36 justify-between flex-shrink-0"
          >
            <p class="text-sm text-gray-600 dark:text-gray-400 my-auto">
              {{ t`Display Scale` }}
            </p>
            <input
              type="number"
              class="my-auto w-10 text-base text-end bg-transparent text-gray-800 focus:text-gray-900"
              :value="scale"
              min="0.1"
              max="10"
              step="0.1"
              @change="setScale"
              @input="setScale"
            />
          </div>
        </div>
      </div>

      <!-- Input Panel Resizer -->
      <HorizontalResizer
        :initial-x="panelWidth"
        :min-x="22 * 16"
        :max-x="maxWidth"
        style="z-index: 5"
        @resize="(x: number) => panelWidth = x"
      />

      <!-- Template Panel -->
      <div
        class="border-l dark:border-gray-800 bg-white dark:bg-gray-890 flex flex-col"
        :style="templateDisplayStyles"
      >
        <!-- Template Editor -->
        <div class="min-h-0">
          <TemplateEditor
            v-if="typeof doc.template === 'string' && hints"
            ref="templateEditor"
            class="overflow-auto custom-scroll custom-scroll-thumb1 h-full"
            :initial-value="doc.template"
            :disabled="!doc.isCustom"
            :hints="hints"
            @input="() => (templateChanged = true)"
            @blur="(value: string) => setTemplate(value)"
          />
        </div>
        <div
          v-if="templateChanged"
          class="flex gap-2 p-2 text-sm text-gray-600 dark:text-gray-400 items-center mt-auto border-t dark:border-gray-800"
        >
          <ShortcutKeys :keys="applyChangesShortcut" :simple="true" />
          {{ t` to apply changes` }}
        </div>

        <!-- Value Key Hints Container -->
        <div
          v-if="hints"
          class="border-t dark:border-gray-800 flex-shrink-0"
          :class="templateChanged ? '' : 'mt-auto'"
        >
          <!-- Value Key Toggle -->
          <div
            class="flex justify-between items-center cursor-pointer select-none p-2"
            @click="toggleShowHints"
          >
            <h2
              class="text-base text-gray-900 dark:text-gray-200 font-semibold"
            >
              {{ t`Key Hints` }}
            </h2>
            <feather-icon
              :name="showHints ? 'chevron-up' : 'chevron-down'"
              class="w-4 h-4 text-gray-600 dark:text-gray-400 resize-none"
            />
          </div>

          <!-- Value Key Hints -->
          <Transition name="hints">
            <div
              v-if="showHints"
              class="overflow-auto custom-scroll custom-scroll-thumb1 p-2 border-t dark:border-gray-800"
              style="max-height: 30vh"
            >
              <TemplateBuilderHint :hints="hints" />
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <Modal
      v-if="doc"
      :open-modal="showSizeModal"
      @closemodal="showSizeModal = !showSizeModal"
    >
      <SetPrintSize :doc="doc" @done="showSizeModal = !showSizeModal" />
    </Modal>
    <Modal
      v-if="doc"
      :open-modal="showTypeModal"
      @closemodal="showTypeModal = !showTypeModal"
    >
      <SetType :doc="doc" @done="showTypeModal = !showTypeModal" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, onMounted } from 'vue';
import Button from 'src/components/Button.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import Link from 'src/components/Controls/Link.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import HorizontalResizer from 'src/components/HorizontalResizer.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';
import ShortcutKeys from 'src/components/ShortcutKeys.vue';
import PrintContainer from 'src/pages/TemplateBuilder/PrintContainer.vue';
import SetPrintSize from 'src/pages/TemplateBuilder/SetPrintSize.vue';
import SetType from 'src/pages/TemplateBuilder/SetType.vue';
import TemplateBuilderHint from 'src/pages/TemplateBuilder/TemplateBuilderHint.vue';
import TemplateEditor from 'src/pages/TemplateBuilder/TemplateEditor.vue';
import { useApp } from 'src/composables/useApp';
import { useTemplateBuilder } from 'src/pages/TemplateBuilder/useTemplateBuilder';

const props = defineProps<{
  name: string;
}>();

const { t, fyo } = useApp();

const {
  doc,
  editMode,
  showHints,
  hints,
  values,
  displayDoc,
  scale,
  panelWidth,
  templateChanged,
  showTypeModal,
  showSizeModal,
  templateEditor,
  printContainer,
  nameField,
  canDisplayPreview,
  applyChangesShortcut,
  maxWidth,
  actions,
  fields,
  displayDocField,
  helperMessage,
  templateBuilderBodyStyles,
  templateDisplayStyles,
  setTemplate,
  setScale,
  toggleShowHints,
  toggleEditMode,
  savePDF,
  sync,
  setType,
  setDisplayDoc,
  selectFile,
} = useTemplateBuilder(props);

provide('doc', computed(() => doc.value));

onMounted(() => {
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.tb = {
      doc,
      editMode,
      showHints,
      hints,
      values,
      displayDoc,
      scale,
      panelWidth,
      templateChanged,
      showTypeModal,
      showSizeModal,
      templateEditor,
      printContainer,
      nameField,
      canDisplayPreview,
      applyChangesShortcut,
      maxWidth,
      actions,
      fields,
      displayDocField,
      helperMessage,
      templateBuilderBodyStyles,
      templateDisplayStyles,
      setTemplate,
      setScale,
      toggleShowHints,
      toggleEditMode,
      savePDF,
      sync,
      setType,
      setDisplayDoc,
      selectFile,
    };
  }
});
</script>

<style scoped>
.hints-enter-from,
.hints-leave-to {
  opacity: 0;
  height: 0px;
}
.hints-enter-to,
.hints-leave-from {
  opacity: 1;
  height: 30vh;
}

.hints-enter-active,
.hints-leave-active {
  transition: all 150ms ease-out;
}
</style>
