<template>
  <view v-if="!isLynx">
    <view class="flex items-baseline justify-between text-main">
      <text class="font-semibold text-base"><slot name="title"></slot></text>
      <slot name="action"></slot>
    </view>
  </view>
  <view v-else class="flex flex-row items-center justify-between px-4 py-2">
    <text class="text-sm font-bold text-main"><slot name="title"></slot></text>
    <slot name="action"></slot>
  </view>
</template>

<script setup lang="ts">
import { isLynx } from 'src/utils/interactive';
</script>
