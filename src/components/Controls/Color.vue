<template>
  <div>
    <div v-if="showLabel" :class="labelClasses">
      {{ df.label }}
    </div>
    <Popover placement="bottom-end">
      <template #target="{ togglePopover }">
        <div
          tabindex="0"
          :class="[inputClasses, containerClasses]"
          class="cursor-pointer select-none"
          @click="!isReadOnly && togglePopover()"
        >
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center">
              <div
                v-if="value"
                class="w-4 h-4 rounded-full me-2 border border-black/10 dark:border-white/10 flex-shrink-0"
                :style="{ backgroundColor: value }"
              ></div>
              <span v-if="value" class="text-sm font-medium">
                {{ selectedColorLabel }}
              </span>
              <span v-else class="text-muted-foreground text-sm font-normal">
                {{ inputPlaceholder }}
              </span>
            </div>
            <!-- Small Chevron Down icon -->
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-muted-foreground opacity-60 flex-shrink-0"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </template>
      <template #content>
        <div class="p-3 w-44 bg-popover text-popover-foreground">
          <!-- Header -->
          <div
            class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-start select-none"
          >
            {{ t`Select Color` }}
          </div>
          <!-- Colors Grid -->
          <div class="grid grid-cols-5 gap-1.5 justify-items-center">
            <div
              v-for="color in colors"
              :key="color.value"
              class="w-6 h-6 rounded-full cursor-pointer transition-all duration-150 hover:scale-110 active:scale-95 relative flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm"
              :style="{ backgroundColor: color.value }"
              :title="color.label"
              @click="setColorValue(color.value)"
            >
              <!-- Small white/black dot inside active color for contrast -->
              <div
                v-if="value === color.value"
                class="w-1.5 h-1.5 rounded-full shadow-sm"
                :class="isDarkColor(color.value) ? 'bg-white' : 'bg-black'"
              ></div>
            </div>
          </div>
          <!-- Custom Color Picker -->
          <div class="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <!-- Custom Swatch triggering Native Picker -->
            <div
              class="relative w-7 h-7 rounded border border-border overflow-hidden flex-shrink-0 cursor-pointer hover:border-ring transition-colors shadow-sm"
            >
              <input
                type="color"
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                :value="value"
                @input="(e) => setColorValue(e.target.value)"
              />
              <div
                class="w-full h-full"
                :style="{ backgroundColor: value || '#0000' }"
              ></div>
            </div>
            <!-- HEX Input -->
            <input
              type="text"
              class="flex-1 min-w-0 text-xs px-2 h-7 border border-border rounded bg-transparent text-foreground uppercase focus:border-ring focus:outline-none"
              :value="value"
              placeholder="#HEX"
              @input="(e) => setColorValue(e.target.value)"
            />
          </div>
        </div>
      </template>
    </Popover>
  </div>
</template>

<script>
import Popover from 'src/components/Popover.vue';
import Row from 'src/components/Row.vue';
import Base from './Base.vue';

export default {
  name: 'Color',
  components: {
    Popover,
    Row,
  },
  extends: Base,
  computed: {
    colors() {
      return this.df.options;
    },
    selectedColorLabel() {
      if (!this.colors) return this.value;
      const color = this.colors.find((c) => this.value === c.value);
      return color ? color.label : this.value;
    },
  },
  methods: {
    setColorValue(value) {
      if (!value) return;
      if (!value.startsWith('#')) {
        value = '#' + value;
      }
      if (/^#[0-9A-F]{3,6}$/i.test(value)) {
        this.triggerChange(value);
      }
    },
    isDarkColor(hex) {
      if (!hex || hex.length < 4) return true;
      let c = hex.substring(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const rgb = parseInt(c, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma < 150;
    },
  },
};
</script>
