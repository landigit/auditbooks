<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <DateTimePicker
      v-if="!isReadOnly"
      :model-value="dateValue"
      :placeholder="inputPlaceholder"
      @update:model-value="handleDateChange"
    />
    <div
      v-else
      class="flex"
      :class="[containerClasses, sizeClasses]"
      tabindex="-1"
    >
      <p
        v-if="!isEmpty"
        :class="[baseInputClasses]"
        class="overflow-auto no-scrollbar whitespace-nowrap text-description"
      >
        {{ formattedValue }}
      </p>
      <p
        v-else-if="inputPlaceholder"
        class="text-base text-description w-full opacity-50"
      >
        {{ inputPlaceholder }}
      </p>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';
import DateVue from './Date.vue';
import { DateTimePicker } from 'src/components/ui';

export default defineComponent({
  extends: DateVue,
  components: {
    DateTimePicker,
  },
});
</script>
