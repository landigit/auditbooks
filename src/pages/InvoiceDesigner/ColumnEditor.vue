<template>
  <div
    class="flex flex-col gap-1 py-2 px-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-850"
  >
    <!-- Drag handle + toggle -->
    <div class="flex items-center gap-2">
      <feather-icon
        name="menu"
        class="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
      />
      <input
        type="checkbox"
        :id="`col-vis-${col.fieldname}`"
        :checked="col.visible"
        class="accent-blue-500 shrink-0"
        @change="
          emit('update:col', {
            ...col,
            visible: ($event.target as HTMLInputElement).checked,
          })
        "
      />
      <label
        :for="`col-vis-${col.fieldname}`"
        class="text-xs font-medium text-gray-700 dark:text-gray-300 grow cursor-pointer select-none"
      >
        {{ col.fieldname }}
      </label>
    </div>

    <!-- Label + width + align when visible -->
    <template v-if="col.visible">
      <div class="flex gap-2 mt-1 ms-6 flex-wrap">
        <!-- Label override -->
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] text-gray-500">Header Label</span>
          <input
            type="text"
            :value="col.label"
            class="text-xs border rounded px-1.5 py-0.5 w-28 dark:bg-gray-800 dark:border-gray-600"
            @input="
              emit('update:col', {
                ...col,
                label: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </div>

        <!-- Width -->
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] text-gray-500">Width</span>
          <input
            type="text"
            :value="col.width"
            placeholder="* / auto / 80"
            class="text-xs border rounded px-1.5 py-0.5 w-20 dark:bg-gray-800 dark:border-gray-600"
            @input="
              emit('update:col', {
                ...col,
                width: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </div>

        <!-- Align -->
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] text-gray-500">Align</span>
          <select
            :value="col.align"
            class="text-xs border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-600"
            @change="
              emit('update:col', {
                ...col,
                align: ($event.target as HTMLSelectElement)
                  .value as ColumnDef['align'],
              })
            "
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from 'src/composables/usePdfInvoice';

defineProps<{ col: ColumnDef }>();
const emit = defineEmits<{ 'update:col': [col: ColumnDef] }>();
</script>
