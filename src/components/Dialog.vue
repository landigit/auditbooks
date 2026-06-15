<template>
  <Teleport to="body">
    <Transition>
      <!-- Backdrop -->
      <div v-if="open" class="backdrop z-20 flex justify-center items-center">
        <!-- Dialog -->
        <div
          class="bg-white dark:bg-gray-850 border dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-25 p-4 shadow-2xl w-dialog flex flex-col gap-4 inner"
        >
          <div class="flex justify-between items-center">
            <h1 class="font-semibold">{{ title }}</h1>
            <FeatherIcon
              :name="config.iconName"
              class="w-6 h-6"
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
            <Button
              v-for="b of orderedButtons"
              :ref="(el) => setButtonRef(el, b.isPrimary)"
              :key="b.label"
              style="min-width: 5rem"
              :type="b.isPrimary ? 'primary' : 'secondary'"
              @click="() => handleClick(b)"
            >
              {{ b.label }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { getIconConfig } from 'src/utils/interactive';
import { DialogButton, ToastType } from 'src/utils/types';
import { usePlatform } from 'src/composables/usePlatform';
import Button from './Button.vue';
import FeatherIcon from './FeatherIcon.vue';

const props = withDefaults(
  defineProps<{
    type?: ToastType;
    title: string;
    detail?: string | string[];
    buttons: DialogButton[];
  }>(),
  {
    type: 'info',
  }
);

const { isMac } = usePlatform();
const open = ref(false);

const primaryButtons = ref<any[]>([]);
const secondaryButtons = ref<any[]>([]);

const orderedButtons = computed(() => {
  const btns = [...props.buttons];
  if (isMac.value) {
    // macOS: Secondary/Cancel first, Primary last.
    btns.sort((a, b) => (a.isPrimary ? 1 : 0) - (b.isPrimary ? 1 : 0));
  } else {
    // Windows/Linux: Primary first, Secondary last.
    btns.sort((a, b) => (a.isPrimary ? 0 : 1) - (b.isPrimary ? 0 : 1));
  }
  return btns;
});

function setButtonRef(el: any, isPrimary: boolean) {
  if (el) {
    if (isPrimary) {
      if (!primaryButtons.value.includes(el)) {
        primaryButtons.value.push(el);
      }
    } else {
      if (!secondaryButtons.value.includes(el)) {
        secondaryButtons.value.push(el);
      }
    }
  }
}

const config = computed(() => {
  return getIconConfig(props.type);
});

watch(open, (value) => {
  if (value) {
    document.addEventListener('keydown', handleEscape);
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});

onMounted(async () => {
  primaryButtons.value = [];
  secondaryButtons.value = [];

  await nextTick(() => {
    open.value = true;
  });

  focusButton();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

function focusButton() {
  let button = primaryButtons.value[0];
  if (!button) {
    button = secondaryButtons.value[0];
  }

  if (!button) {
    return;
  }

  button.$el.focus();
}

function handleEscape(event: KeyboardEvent) {
  if (event.code !== 'Escape') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (props.buttons.length === 1) {
    return handleClick(props.buttons[0]);
  }

  const escapeButton = props.buttons.find(({ isEscape }) => isEscape);

  if (!escapeButton) {
    return;
  }

  return handleClick(escapeButton);
}

function handleClick(button: DialogButton) {
  button.action();
  open.value = false;
}
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
