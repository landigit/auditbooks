<template>
  <div class="flex items-baseline justify-between dark:text-white">
    <span class="font-semibold text-base text-black dark:text-white"
      ><slot name="title"></slot
    ></span>
    <slot name="action"></slot>
  </div>
</template>
