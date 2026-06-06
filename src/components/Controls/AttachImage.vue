<template>
  <view
    class="relative bg-surface border border-border flex-center overflow-hidden group"
    :class="{
      rounded: size === 'form',
      'w-20 h-20 rounded-full': size !== 'small' && size !== 'form',
      'w-12 h-12 rounded-full': size === 'small',
    }"
    :title="df?.label"
    :style="imageSizeStyle"
  >
    <img v-if="value" :src="value" />
    <view v-else :class="[!isReadOnly ? 'group-hover:opacity-90' : '']">
      <view
        v-if="letterPlaceholder"
        class="flex h-full items-center justify-center text-description font-semibold w-full text-4xl select-none"
      >
        {{ letterPlaceholder }}
      </view>
      <svg
        v-else
        class="w-6 h-6 text-description"
        viewBox="0 0 24 21"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M21 3h-4l-2-3H9L7 3H3a3 3 0 00-3 3v12a3 3 0 003 3h18a3 3 0 003-3V6a3 3 0 00-3-3zm-9 14a5 5 0 110-10 5 5 0 010 10z"
          fill="currentColor"
          fill-rule="nonzero"
        />
      </svg>
    </view>
    <view
      class="hidden w-full h-full absolute justify-center items-end"
      :class="[!isReadOnly ? 'group-hover:flex' : '']"
      style="background: var(--color-backdrop); backdrop-filter: blur(2px)"
    >
      <button class="bg-surface-hover p-0.5 rounded mb-1" @tap="handleClick">
        <LucideIcon
          :name="shouldClear ? 'x' : 'upload'"
          class="w-4 h-4 text-description"
        />
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { fyo } from 'src/initFyo';
import { getDataURL } from 'src/utils/misc';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';
import LucideIcon from '../LucideIcon.vue';

interface AttachImageProps extends BaseControlProps {
  letterPlaceholder?: string;
  value?: string;
}

const props = withDefaults(defineProps<AttachImageProps>(), {
  letterPlaceholder: '',
  value: '',
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

const mime_types: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const inputRef = ref<HTMLElement | null>(null);
const { isReadOnly, triggerChange, focus } = useBaseControl(
  props as any,
  emit,
  inputRef
);

const imageSizeStyle = computed(() => {
  if (props.size === 'form') {
    return { width: '135px', height: '135px' };
  }
  return {};
});

const shouldClear = computed(() => {
  return !!props.value;
});

const handleClick = async () => {
  if (props.value) {
    return await clearImage();
  }
  return await selectImage();
};

const clearImage = async () => {
  triggerChange(null);
};

const selectImage = async () => {
  if (isReadOnly.value) {
    return;
  }
  const options = {
    title: fyo.t`Select Image`,
    filters: [{ name: 'Image', extensions: Object.keys(mime_types) }],
  };

  // @ts-ignore
  const { name, success, data } = await ipc.selectFile(options);

  if (!success) {
    return;
  }
  const extension = name.split('.').at(-1);
  const type = (extension && mime_types[extension]) || 'image/png';
  const dataURL = await getDataURL(type, data);

  triggerChange(dataURL);
};

defineExpose({
  focus,
});
</script>
