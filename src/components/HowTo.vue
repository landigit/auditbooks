<template>
  <button class="flex items-center z-10" @click="openHelpLink">
    <p class="me-1"><slot></slot></p>
    <LucideIcon
      v-if="icon"
      class="h-5 w-5 ms-3 text-indicator-blue-text"
      name="help-circle"
    />
  </button>
</template>

<script setup lang="ts">
import LucideIcon from './LucideIcon.vue';

interface HowToProps {
  link?: string;
  icon?: boolean;
}

const props = withDefaults(defineProps<HowToProps>(), {
  link: '',
  icon: true,
});

const openHelpLink = () => {
  (window as any).appIpc?.openLink(props.link);
};
</script>
