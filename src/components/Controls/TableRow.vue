<template>
  <Row
    :ratio="ratio"
    class="w-full px-2 group items-center justify-center h-row-mid"
    :class="readOnly ? '' : 'hover:bg-surface-hover'"
  >
    <!-- Index or Remove button -->
    <view
      class="flex items-center ps-2 text-description"
      @mouseenter="isRowIndexVisible = false"
      @mouseleave="isRowIndexVisible = true"
    >
      <text class="relative w-4 h-4 flex items-center justify-center">
        <lucide-icon
          v-if="!readOnly && !isRowIndexVisible"
          name="x"
          class="w-4 h-4 -ms-1 cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-main transition"
          :button="true"
          tabindex="0"
          role="button"
          aria-label="Delete row"
          @tap="emit('remove')"
          @keydown.enter="emit('remove')"
        />
        <text
          v-if="!readOnly && isRowIndexVisible"
          class="absolute left-0 top-0 w-full h-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-main rounded"
          tabindex="0"
          role="button"
          aria-label="Delete row"
          @focus="isRowIndexVisible = false"
          @keydown.enter="emit('remove')"
        >
          {{ (row.idx ?? 0) + 1 }}
        </text>
      </text>
      <text v-if="readOnly">
        {{ (row.idx ?? 0) + 1 }}
      </text>
    </view>

    <!-- Data Input Form Control -->
    <FormControl
      v-for="(df, i) in tableFields"
      :key="df.fieldname"
      class="w-full"
      :size="size"
      :df="df"
      :value="row[df.fieldname]"
      @change="(value) => onChange(df, value)"
      @focus="onFieldFocus(i)"
      @blur="onFieldBlur(i)"
    />
    <Button
      v-if="canEditRow"
      :icon="true"
      :padding="false"
      :background="false"
      @tap="openRowQuickEdit"
    >
      <lucide-icon name="edit" class="w-4 h-4 text-description" />
    </Button>

    <!-- Error Display -->
    <view
      v-if="hasErrors"
      class="text-xs text-error ps-2 col-span-full relative"
      style="bottom: 0.75rem; height: 0px"
    >
      {{ getErrorString() }}
    </view>
  </Row>
</template>

<script setup lang="ts">
import { ref, computed, provide, nextTick, getCurrentInstance } from 'vue';
import { Doc } from 'fyo/model/doc';
import Row from 'src/components/Row.vue';
import { getErrorMessage } from 'src/utils';
import Button from '../Button.vue';
import FormControl from './FormControl.vue';

interface TableRowProps {
  row: Doc;
  tableFields: any[];
  size?: string;
  ratio?: any[];
  isNumeric?: Function;
  readOnly?: boolean;
  canEditRow?: boolean;
}

const props = withDefaults(defineProps<TableRowProps>(), {
  canEditRow: false,
  readOnly: false,
});

const emit = defineEmits<{
  (e: 'remove'): void;
  (e: 'change', df: any, val: any): void;
  (e: 'editrow', row: Doc): void;
}>();

provide(
  'doc',
  computed(() => props.row)
);

const isRowIndexVisible = ref(false);
const errors = ref<Record<string, string | null>>({});

const hasErrors = computed(() => {
  return Object.values(errors.value).filter(Boolean).length > 0;
});

const onChange = async (df: any, value: any) => {
  const fieldname = df.fieldname;
  errors.value[fieldname] = null;
  const oldValue = props.row[fieldname];
  try {
    await props.row.set(fieldname, value);
    emit('change', df, value);
  } catch (e) {
    errors.value[fieldname] = getErrorMessage(e as Error, props.row);
    props.row[fieldname] = '';
    nextTick(() => (props.row[fieldname] = oldValue));
  }
};

const getErrorString = () => {
  return Object.values(errors.value).filter(Boolean).join(' ');
};

const instance = getCurrentInstance();
const openRowQuickEdit = () => {
  if (!props.row) return;
  emit('editrow', props.row);
  instance?.parent?.emit('editrow', props.row);
};

const onFieldFocus = (index: number) => {
  if (index === 0) {
    isRowIndexVisible.value = true;
  }
};

const onFieldBlur = (index: number) => {
  if (index === 0) {
    isRowIndexVisible.value = false;
  }
};

const focusFirstInput = () => {
  const el = instance?.proxy?.$el;
  const firstControl = el?.querySelector(
    '.form-control, input, textarea, select'
  );
  if (firstControl) {
    (firstControl as HTMLElement).focus();
  }
};

defineExpose({
  focusFirstInput,
});
</script>
