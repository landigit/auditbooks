<script setup lang="ts">
import { ref, watch } from "vue";
import { PeriodKey } from "src/utils/types";

// Define Props
const props = withDefaults(
  defineProps<{
    commonPeriod?: PeriodKey;
  }>(),
  {
    commonPeriod: "This Year",
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "period-change", value: PeriodKey): void;
}>();

// Reactive State
const period = ref<PeriodKey>("This Year");
const periodOptions = ref<PeriodKey[]>([
  "This Year",
  "YTD",
  "This Quarter",
  "This Month",
]);

// Methods
const setData = async () => {
  return Promise.resolve(null);
};

const periodChange = async () => {
  emit("period-change", period.value);
  await setData();
};

// Watchers
watch(period, async () => {
  await periodChange();
});

watch(
  () => props.commonPeriod,
  (val) => {
    if (!val || !periodOptions.value.includes(val)) {
      return;
    }
    period.value = val;
  },
);
</script>
