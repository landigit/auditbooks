<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label
      }}<span v-if="showMandatory" class="text-red-500 ms-1">*</span>
    </div>
    <Popover ref="popover" placement="bottom-start" class="w-full">
      <!-- Target: The field input/display box -->
      <template #target>
        <div
          :class="[containerClasses, sizeClasses]"
          class="flex items-center justify-between cursor-pointer border rounded-md"
          @click="() => !isReadOnly && ($refs.popover as any).togglePopover()"
        >
          <p
            v-if="!isEmpty"
            :class="[baseInputClasses]"
            class="overflow-auto no-scrollbar whitespace-nowrap text-foreground"
          >
            {{ formattedValue }}
          </p>
          <p
            v-else-if="inputPlaceholder"
            class="text-sm text-muted-foreground w-full select-none"
          >
            {{ inputPlaceholder }}
          </p>

          <span
            v-if="!isReadOnly"
            class="p-0.5 rounded -me-1 ms-1 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          >
            <FeatherIcon
              name="calendar"
              class="w-4 h-4"
              :class="showMandatory ? 'text-red-500' : ''"
            />
          </span>
        </div>
      </template>

      <!-- Popover Content: The modernized DatetimePicker -->
      <template #content>
        <div
          class="bg-popover text-popover-foreground border border-border rounded-md shadow-md"
        >
          <DatetimePicker
            :show-clear="!isRequired"
            :select-time="selectTime"
            :model-value="internalValue"
            :format-value="formatValue"
            @update:model-value="
              (value) => {
                triggerChange(value);
                if (!selectTime) ($refs.popover as any).togglePopover(false);
              }
            "
          />
        </div>
      </template>
    </Popover>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Field } from 'schemas/types';
import DatetimePicker from './DatetimePicker.vue';
import FeatherIcon from '../FeatherIcon.vue';
import Popover from '../Popover.vue';
import Base from './Base.vue';

export default defineComponent({
  name: 'DateControl',
  components: { Popover, FeatherIcon, DatetimePicker },
  extends: Base,
  props: {
    value: [Date, String],
    df: Object as PropType<Field>,
  },
  computed: {
    selectTime(): boolean {
      return this.df?.fieldtype === 'Datetime';
    },
    internalValue() {
      if (this.value == null) {
        return undefined;
      }

      if (typeof this.value === 'string') {
        const parsed = new Date(this.value);
        return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
      }

      return this.value instanceof Date ? this.value : undefined;
    },
    formattedValue() {
      return this.formatValue(this.internalValue);
    },
  },
  methods: {
    formatValue(value?: Date | null) {
      if (value == null) {
        return '';
      }

      return this.fyo.format(
        value,
        this.df ?? (this.selectTime ? 'Datetime' : 'Date')
      );
    },
  },
});
</script>
