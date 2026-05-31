<template>
  <div>
    <div v-if="showLabel && df" :class="labelClasses">
      {{ df.label }}
    </div>
    <div :class="containerClasses" class="flex gap-2 items-center">
      <label
        for="attachment"
        class="block whitespace-nowrap overflow-auto no-scrollbar"
        :class="[inputClasses, !value ? 'text-description' : 'cursor-default']"
        >{{ label }}</label
      >
      <input
        id="attachment"
        ref="fileInput"
        type="file"
        accept="image/*,.pdf"
        class="hidden"
        :disabled="!!value"
        @input="selectFile"
      />

      <!-- Buttons -->
      <div class="me-2 flex gap-1">
        <!-- Upload Button -->
        <button v-if="!value" class="p-0.5 rounded" @click="upload">
          <LucideIcon name="upload" class="h-4 w-4 text-description" />
        </button>

        <!-- Download Button -->
        <button v-if="value" class="p-0.5 rounded" @click="download">
          <LucideIcon name="download" class="h-4 w-4 text-description" />
        </button>

        <!-- Clear Button -->
        <button
          v-if="value && !isReadOnly"
          class="p-0.5 rounded"
          @click="clear"
        >
          <LucideIcon name="x" class="h-4 w-4 text-description" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t } from 'fyo';
import { convertFileToDataURL } from 'src/utils/api/misc.js';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';
import LucideIcon from '../LucideIcon.vue';

const props = withDefaults(defineProps<BaseControlProps>(), {
  step: 1,
  border: false,
  size: 'large',
  showLabel: false,
  containerStyles: () => ({}),
  textRight: null,
  readOnly: null,
  required: null,
});

const emit = defineEmits<{
  (e: 'focus', ev: FocusEvent): void;
  (e: 'input', ev: Event): void;
  (e: 'change', val: any): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const {
  labelClasses,
  inputClasses,
  containerClasses,
  isReadOnly,
  triggerChange,
  focus,
} = useBaseControl(props as any, emit, fileInput);

const label = computed(() => {
  if (props.value) {
    return (props.value as any).name;
  }
  return props.df?.placeholder ?? props.df?.label ?? t`Attachment`;
});

const upload = () => {
  fileInput.value?.click();
};

const clear = () => {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  triggerChange(null);
};

const download = () => {
  if (!props.value) {
    return;
  }

  const { name, data } = props.value as any;
  if (!name || !data) {
    return;
  }

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = data;
  a.target = '_self';
  a.download = name;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const selectFile = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) {
    return;
  }

  const attachment = await getAttachment(file);
  triggerChange(attachment);
};

const getAttachment = async (file: File | null) => {
  if (!file) {
    return null;
  }

  const name = file.name;
  const type = file.type;
  const data = await convertFileToDataURL(file, type);
  return { name, type, data };
};

defineExpose({
  focus,
});
</script>
