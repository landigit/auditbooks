<template>
  <div
    id="tooltip"
    ref="tooltip"
    style="transition: opacity 100ms ease-in"
    :style="{ opacity }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import flip from '@popperjs/core/lib/modifiers/flip';
import offsetModifier from '@popperjs/core/lib/modifiers/offset';
import preventOverflow from '@popperjs/core/lib/modifiers/preventOverflow';
import { createPopper, Instance } from '@popperjs/core/lib/popper-lite';

const props = withDefaults(
  defineProps<{
    offset?: number;
    placement?: string;
  }>(),
  {
    offset: 10,
    placement: 'auto',
  }
);

const tooltip = ref<HTMLElement | null>(null);
const opacity = ref(0);
let popper: Instance | null = null;
let virtualElement: { getBoundingClientRect: () => DOMRect } | null = null;

function generateGetBoundingClientRect(x = 0, y = 0) {
  return () =>
    ({
      width: 0,
      height: 0,
      top: y,
      right: x,
      bottom: y,
      left: x,
    }) as DOMRect;
}

function create() {
  if (popper) {
    opacity.value = 1;
    return;
  }

  if (tooltip.value) {
    tooltip.value.setAttribute('data-show', '');
    virtualElement = {
      getBoundingClientRect: generateGetBoundingClientRect(-1000, -1000),
    };
    popper = createPopper(virtualElement, tooltip.value, {
      placement: props.placement as any,
      modifiers: [
        flip,
        preventOverflow,
        Object.assign(offsetModifier, {
          options: { offset: [0, props.offset] },
        }),
      ],
    });
    opacity.value = 1;
  }
}

function update({ clientX, clientY }: { clientX: number; clientY: number }) {
  if (!popper || !virtualElement) {
    return;
  }
  virtualElement.getBoundingClientRect = generateGetBoundingClientRect(
    clientX,
    clientY
  );
  popper.update();
}

function destroy() {
  opacity.value = 0;
  if (tooltip.value) {
    tooltip.value.removeAttribute('data-show');
  }
  popper?.destroy();
  virtualElement = null;
  popper = null;
}

defineExpose({
  create,
  update,
  destroy,
});
</script>

<style scoped>
#tooltip {
  display: none;
  pointer-events: none;
}

#tooltip[data-show] {
  display: block;
}
</style>
