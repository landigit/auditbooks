<template>
  <div style="min-width: 192px; max-width: 300px">
    <div
      class="p-2 flex justify-between"
      :class="values.length ? 'border-b border-border' : ''"
    >
      <p
        v-if="schema?.naming !== 'random' && !schema?.isChild"
        class="font-semibold text-base text-main"
      >
        {{ name }}
      </p>
      <p class="font-semibold text-base text-description">
        {{ schema?.label ?? '' }}
      </p>
    </div>
    <div v-if="values.length" class="flex gap-2 p-2 flex-wrap">
      <p v-for="v of values" :key="v.label" class="pill bg-canvas-muted">
        <span class="text-description">{{ v.label }}</span>
        <span class="text-main ml-1.5">{{ v.value }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, watch, onMounted } from 'vue';
import { isFalsy } from 'fyo/utils';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';

// --- Props & Emits ---
const props = defineProps<{
  schemaName: string;
  name: string;
}>();

// --- State ---
const values = ref<{ label: string; value: string }[]>([]);

// --- Computed ---
const schema = computed(() => {
  return fyo.schemaMap[props.schemaName];
});

// --- Watchers ---
watch(
  () => props.name,
  async (v1, v2) => {
    if (v1 === v2) {
      return;
    }

    await setValues();
  }
);

// --- Lifecycle ---
onMounted(async () => {
  await setValues();
});

// --- Methods ---
async function setValues() {
  const fields: Field[] = (schema.value?.fields ?? []).filter(
    (f) =>
      f &&
      f.fieldtype !== 'Table' &&
      f.fieldtype !== 'AttachImage' &&
      f.fieldtype !== 'Attachment' &&
      f.fieldname !== 'name' &&
      !f.hidden &&
      !f.meta &&
      !f.abstract &&
      !f.computed
  );

  const data = (
    await fyo.db.getAll(props.schemaName, {
      fields: fields.map((f) => f.fieldname),
      filters: { name: props.name },
    })
  )[0];

  if (!data) {
    return;
  }

  values.value = fields
    .map((f) => {
      const value = data[f.fieldname];
      if (isFalsy(value)) {
        return { value: '', label: '' };
      }

      return {
        value: fyo.format(data[f.fieldname], f),
        label: f.label,
      };
    })
    .filter((i) => !!i.value);
}
</script>
