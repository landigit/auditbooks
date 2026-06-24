<template>
  <Row
    ref="root"
    :ratio="ratio"
    class="w-full px-2 group flex items-center justify-center h-row-mid"
    :class="readOnly ? '' : 'hover:bg-gray-25 dark:hover:bg-gray-900'"
  >
    <!-- Index or Remove button -->
    <div
      class="flex items-center ps-2 text-gray-600 dark:text-gray-400"
      @mouseenter="isRowIndexVisible = false"
      @mouseleave="isRowIndexVisible = true"
    >
      <span
        v-if="!readOnly"
        class="relative w-4 h-4 flex items-center justify-start"
      >
        <feather-icon
          v-if="!isRowIndexVisible"
          name="x"
          class="w-4 h-4 -ms-1 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 dark:focus:bg-gray-800 transition"
          :button="true"
          tabindex="0"
          role="button"
          aria-label="Delete row"
          @click="$emit('remove')"
          @keydown.enter="$emit('remove')"
        />
        <span
          v-if="isRowIndexVisible"
          class="absolute left-0 top-0 w-full h-full flex items-center justify-start focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          tabindex="0"
          role="button"
          aria-label="Delete row"
          @focus="isRowIndexVisible = false"
          @keydown.enter="$emit('remove')"
        >
          {{ (row as any).idx + 1 }}
        </span>
      </span>
      <span v-else>
        {{ (row as any).idx + 1 }}
      </span>
    </div>

    <!-- Data Input Form Control -->
    <FormControl
      v-for="(df, i) in tableFields"
      :key="df.fieldname"
      :size="size"
      :df="df"
      :value="row[df.fieldname]"
      @change="(value: any) => onChange(df, value)"
      @focus="onFieldFocus(i)"
      @blur="onFieldBlur(i)"
    />
    <Button
      v-if="canEditRow"
      :icon="true"
      :padding="false"
      :background="false"
      @click="openRowQuickEdit"
    >
      <feather-icon
        name="edit"
        class="w-4 h-4 text-gray-600 dark:text-gray-400"
      />
    </Button>

    <!-- Error Display -->
    <div
      v-if="hasErrors"
      class="text-xs text-red-600 ps-2 col-span-full relative"
      style="bottom: 0.75rem; height: 0px"
    >
      {{ getErrorString() }}
    </div>
  </Row>
</template>

<script setup lang="ts">
import { ref, computed, provide, nextTick } from 'vue';
import { Doc } from 'fyo/model/doc';
import Row from 'src/components/Row.vue';
import { getErrorMessage } from 'src/utils';
import Button from '../Button.vue';
import FormControl from './FormControl.vue';
import FeatherIcon from '../FeatherIcon.vue';

defineOptions({
  name: 'TableRow',
});

const props = defineProps<{
  row: Doc;
  tableFields?: any[];
  size?: string;
  ratio?: any[];
  isNumeric?: Function;
  readOnly?: boolean;
  canEditRow?: boolean;
}>();

const emit = defineEmits(['remove', 'change', 'editrow']);

provide(
  'doc',
  computed(() => props.row)
);

const isRowIndexVisible = ref(false);
const errors = ref<Record<string, any>>({});

const hasErrors = computed(() => {
  return Object.values(errors.value).filter(Boolean).length;
});

async function onChange(df: any, value: any) {
  const fieldname = df.fieldname;
  errors.value[fieldname] = null;
  const oldValue = props.row[fieldname];
  try {
    await props.row.set(fieldname, value);
    emit('change', df, value);
  } catch (e) {
    errors.value[fieldname] = getErrorMessage(e as Error, props.row);
    (props.row as any)[fieldname] = '';
    await nextTick(() => ((props.row as any)[fieldname] = oldValue));
  }
}

function getErrorString() {
  return Object.values(errors.value).filter(Boolean).join(' ');
}

function openRowQuickEdit() {
  if (!props.row) return;
  emit('editrow', props.row);
}

function onFieldFocus(index: number) {
  if (index === 0) {
    isRowIndexVisible.value = true;
  }
}

function onFieldBlur(index: number) {
  if (index === 0) {
    isRowIndexVisible.value = false;
  }
}

const root = ref<HTMLElement | null>(null);

function focusFirstInput() {
  const firstControl = root.value?.querySelector(
    '.form-control, input, textarea, select'
  ) as HTMLElement;
  if (firstControl) {
    firstControl.focus();
  }
}

defineExpose({
  focusFirstInput,
});
</script>
