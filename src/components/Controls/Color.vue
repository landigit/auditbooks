<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <Popover :open="isShown" @update:open="(val) => (isShown = val)">
      <PopoverAnchor as-child>
        <div
          tabindex="0"
          :class="[inputClasses, containerClasses]"
          @click="!isReadOnly && (isShown = !isShown)"
        >
          <div class="flex items-center">
            <div
              v-if="value"
              class="w-3 h-3 rounded me-1"
              :style="{ backgroundColor: value as any }"
            ></div>
            <span v-if="value">
              {{ selectedColorLabel }}
            </span>
            <span v-else class="text-description">
              {{ inputPlaceholder }}
            </span>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        class="w-auto p-0 overflow-hidden"
      >
        <div class="text-sm p-2 text-center">
          <div>
            <Row :column-count="5" gap="0.5rem">
              <div
                v-for="color in colors"
                :key="color.value"
                class="w-4 h-4 rounded cursor-pointer"
                :style="{ backgroundColor: color.value }"
                @click="setColorValue(color.value)"
              ></div>
            </Row>
          </div>
          <div class="mt-3 w-28">
            <input
              type="color"
              :placeholder="t`Custom Hex`"
              :class="[inputClasses, containerClasses]"
              :value="value as any"
              style="padding: 0"
              @change="(e: any) => setColorValue(e.target.value)"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { t } from 'fyo';
import {
  BaseControlProps,
  useBaseControl,
} from 'src/composables/useBaseControl';
import { Popover, PopoverAnchor, PopoverContent } from 'src/components/Ui';
import Row from 'src/components/Row.vue';

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

const isShown = ref(false);

const inputRef = ref<HTMLElement | null>(null);
const {
  labelClasses,
  inputClasses,
  containerClasses,
  inputPlaceholder,
  isReadOnly,
  triggerChange,
  focus,
} = useBaseControl(props as any, emit, inputRef);

const colors = computed<any[]>(() => {
  return (props.df as any).options || [];
});

const selectedColorLabel = computed(() => {
  if (!colors.value) return props.value;
  const color = colors.value.find((c) => props.value === c.value);
  return color ? color.label : props.value;
});

const setColorValue = (val: string) => {
  if (val.startsWith('var(')) {
    triggerChange(val);
    return;
  }
  if (!val.startsWith('#')) {
    val = '#' + val;
  }
  if (/^#[0-9A-F]{6}$/i.test(val)) {
    triggerChange(val);
  }
};

defineExpose({
  focus,
});
</script>
