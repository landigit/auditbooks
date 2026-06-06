<template>
  <view class="flex items-center z-10" @tap="openHelpLink">
    <text class="me-1"><slot></slot></text>
    <LucideIcon
      v-if="icon"
      class="h-5 w-5 ms-3 text-indicator-blue-text"
      name="help-circle"
    />
  </view>
</template>

<script setup lang="ts">
import LucideIcon from "./LucideIcon.vue";

interface HowToProps {
  link?: string;
  icon?: boolean;
}

const props = withDefaults(defineProps<HowToProps>(), {
  link: "",
  icon: true,
});

const openHelpLink = () => {
  (window as any).ipc?.openLink(props.link);
};
</script>
