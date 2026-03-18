<template>
  <Teleport to="body">
    <Transition>
      <!-- Backdrop -->
      <div v-if="open" class="backdrop z-50 flex justify-center items-center bg-black/40">
        <!-- Dialog -->
        <div
          class="glass border dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-25 p-6 shadow-2xl w-dialog flex flex-col gap-4 inner"
        >
          <div class="flex justify-between items-center">
            <h1 class="font-semibold">{{ title }}</h1>
            <LucideIcon
              :name="config.iconName"
              class="w-6 h-6"
              :size="24"
              :class="config.iconColor"
            />
          </div>

          <template v-if="detail">
            <p v-if="typeof detail === 'string'" class="text-base">
              {{ detail }}
            </p>

            <div v-else v-for="d of detail">
              <p class="text-base">{{ d }}</p>
            </div>
          </template>
          <div class="flex justify-end gap-4 mt-4">
            <UIButton
              v-for="(b, index) of buttons"
              :ref="b.isPrimary ? 'primary' : 'secondary'"
              :key="b.label"
              class="min-w-[5rem]"
              :variant="b.isPrimary ? 'default' : 'secondary'"
              @click="() => handleClick(index)"
            >
              {{ b.label }}
            </UIButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<script lang="ts">
import { getIconConfig } from 'src/utils/interactive';
import { DialogButton, ToastType } from 'src/utils/types';
import { defineComponent, nextTick, PropType, ref } from 'vue';
import LucideIcon from './LucideIcon.vue';

export default defineComponent({
  components: { LucideIcon },
  props: {
    type: { type: String as PropType<ToastType>, default: 'info' },
    title: { type: String, required: true },
    detail: {
      type: [String, Array] as PropType<string | string[]>,
      required: false,
    },
    buttons: {
      type: Array as PropType<DialogButton[]>,
      required: true,
    },
  },
  setup() {
    return {
      primary: ref<InstanceType<typeof UIButton>[] | null>(null),
      secondary: ref<InstanceType<typeof UIButton>[] | null>(null),
    };
  },
  data() {
    return { open: false };
  },
  computed: {
    config() {
      return getIconConfig(this.type);
    },
  },
  watch: {
    open(value) {
      if (value) {
        document.addEventListener('keydown', this.handleEscape);
      } else {
        document.removeEventListener('keydown', this.handleEscape);
      }
    },
  },
  async mounted() {
    await nextTick(() => {
      this.open = true;
    });

    this.focusButton();
  },
  methods: {
    focusButton() {
      let button = this.primary?.[0];
      if (!button) {
        button = this.secondary?.[0];
      }

      if (!button) {
        return;
      }

      button.$el.focus();
    },
    handleEscape(event: KeyboardEvent) {
      if (event.code !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (this.buttons.length === 1) {
        return this.handleClick(0);
      }

      const index = this.buttons.findIndex(({ isEscape }) => isEscape);

      if (index === -1) {
        return;
      }

      return this.handleClick(index);
    },
    handleClick(index: number) {
      const button = this.buttons[index];
      button.action();
      this.open = false;
    },
  },
});
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 100ms ease-out;
}

.inner {
  transition: all 150ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-from .inner,
.v-leave-to .inner {
  transform: translateY(-50px);
}

.v-enter-to .inner,
.v-leave-from .inner {
  transform: translateY(0px);
}
</style>
