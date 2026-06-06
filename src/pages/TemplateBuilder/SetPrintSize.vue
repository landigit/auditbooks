<template>
  <view v-if="!isLynx">
    <view class="w-form">
      <FormHeader :form-title="t`Set Print Size`" />
      <view class="border-b border-border" />
      <view class="p-4 w-full flex flex-col gap-4">
        <text class="text-base text-main">
          {{
            t`Select a pre-defined page size, or set a custom page size for your Print Template.`
          }}
        </text>
        <Select
          :df="df"
          :value="size"
          :border="true"
          :show-label="true"
          @change="sizeChange"
        />
        <view class="flex gap-4 w-full">
          <Float
            class="w-full"
            :df="fyo.getField('PrintTemplate', 'height')"
            :border="true"
            :show-label="true"
            :value="height"
            @change="(v) => valueChange(v, 'height')"
          />
          <Float
            class="w-full"
            :df="fyo.getField('PrintTemplate', 'width')"
            :border="true"
            :show-label="true"
            :value="width"
            @change="(v) => valueChange(v, 'width')"
          />
        </view>
      </view>
      <view class="flex border-t border-border p-4">
        <Button class="ml-auto" type="primary" @tap="done">{{
          t`Done`
        }}</Button>
      </view>
    </view>
  </view>
  <view v-else class="Container dark">
    <view class="Card">
      <view class="Header">
        <text class="Title">Set Print Size</text>
        <text class="Subtitle"
          >This page is not supported on Mobile Native yet.</text
        >
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { PrintTemplate } from "models/baseModels/PrintTemplate";
import { OptionField } from "schemas/types";
import Button from "src/components/Button.vue";
import Float from "src/components/Controls/Float.vue";
import Select from "src/components/Controls/Select.vue";
import FormHeader from "src/components/FormHeader.vue";
import { paperSizeMap, printSizes } from "src/utils/ui";
import { fyo } from "src/initFyo";
import { t } from "fyo";

type SizeName = (typeof printSizes)[number];

// Define Props
const props = defineProps<{
  doc: PrintTemplate;
}>();

// Define Emits
const emit = defineEmits<{
  (e: "done"): void;
}>();

// Reactive State
const size = ref("A4");
const width = ref(21);
const height = ref(29.7);

// Computed Properties
const df = computed<OptionField>(() => {
  return {
    label: "Page Size",
    fieldname: "size",
    fieldtype: "Select",
    options: printSizes.map((value) => ({ value, label: value })),
    default: "A4",
  };
});

// Methods
const sizeChange = (v: string) => {
  const paperSize = paperSizeMap[v as SizeName];
  if (!paperSize) {
    return;
  }

  height.value = paperSize.height;
  width.value = paperSize.width;
};

const valueChange = (v: number, name: "width" | "height") => {
  if (name === "width") {
    if (width.value === v) {
      return;
    }
    size.value = "Custom";
    width.value = v;
  } else {
    if (height.value === v) {
      return;
    }
    size.value = "Custom";
    height.value = v;
  }
};

const done = async () => {
  await props.doc.set("width", width.value);
  await props.doc.set("height", height.value);
  emit("done");
};

// Lifecycles
onMounted(() => {
  width.value = props.doc.width ?? 21;
  height.value = props.doc.height ?? 29.7;

  size.value = "";
  Object.entries(paperSizeMap).forEach(([name, paperSize]) => {
    if (width.value === paperSize.width && height.value === paperSize.height) {
      size.value = name;
    }
  });

  size.value ||= "Custom";
});
</script>
