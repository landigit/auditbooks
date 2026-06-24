<template>
  <button class="flex items-center z-10" @click="openHelpLink">
    <p class="me-1"><slot></slot></p>
    <FeatherIcon
      v-if="icon"
      class="h-5 w-5 ms-3 text-blue-400"
      name="help-circle"
    />
  </button>
</template>

<script setup lang="ts">
import FeatherIcon from './FeatherIcon.vue';

defineOptions({
  name: 'HowTo',
});

const props = withDefaults(
  defineProps<{
    link?: string;
    icon?: boolean;
  }>(),
  {
    icon: true,
  }
);

async function openHelpLink() {
  if (!props.link) return;
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(props.link).catch(console.error);
}
</script>
