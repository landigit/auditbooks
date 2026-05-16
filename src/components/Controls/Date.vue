<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <DatePicker
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
import { fyo } from 'src/initFyo';
import { defineComponent } from 'vue';
import Base from './Base.vue';
import { DatePicker } from 'src/components/Ui';

export default defineComponent({
  extends: Base,
  components: {
    DatePicker,
  },
  emits: ['input', 'focus', 'change'],
  computed: {
    dateValue(): Date | null {
      if (!this.value) return null;
      const d = new Date(this.value as string);
      return isNaN(d.getTime()) ? null : d;
    },
    formattedValue() {
      const value = this.parse(this.value);
      return fyo.format(value, this.df, this.doc);
    },
  },
  methods: {
    handleDateChange(val: Date | null) {
      if (!val) {
        this.triggerChange(null);
        return;
      }
      // Store as ISO string which is the standard in this app
      this.triggerChange(val.toISOString());
    },
  },
});
</script>
