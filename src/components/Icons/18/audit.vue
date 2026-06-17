<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
    <!-- Shield body -->
    <path
      :fill="lightColor"
      d="M9 0 L1 3.5 L1 9 C1 13.2 4.6 17 9 18 C13.4 17 17 13.2 17 9 L17 3.5 Z"
    />
    <!-- Checkmark -->
    <path
      fill="none"
      :stroke="darkColor"
      d="M5.5 9.5 L7.5 11.5 L12.5 6.5"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Lines representing log lines -->
    <rect
      :fill="darkColor"
      x="5"
      y="7.5"
      width="8"
      height="1"
      rx="0.5"
      opacity="0.3"
    />
    <rect
      :fill="darkColor"
      x="5"
      y="9.5"
      width="6"
      height="1"
      rx="0.5"
      opacity="0.3"
    />
    <rect
      :fill="darkColor"
      x="5"
      y="11.5"
      width="4"
      height="1"
      rx="0.5"
      opacity="0.3"
    />
  </svg>
</template>
<script>
import Base from '../base.vue';
export default {
  name: 'IconAudit',
  extends: Base,
};
</script>
