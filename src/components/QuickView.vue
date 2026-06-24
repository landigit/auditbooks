<template>
  <div style="min-width: 192px; max-width: 300px">
    <div
      class="p-2 flex justify-between"
      :class="values.length ? 'border-b dark:border-gray-800' : ''"
    >
      <p
        v-if="schema?.naming !== 'random' && !schema?.isChild"
        class="font-semibold text-base text-gray-900 dark:text-gray-25"
      >
        {{ name }}
      </p>
      <p class="font-semibold text-base text-gray-600 dark:text-gray-400">
        {{ schema?.label ?? '' }}
      </p>
    </div>
    <div v-if="values.length" class="flex gap-2 p-2 flex-wrap">
      <p
        v-for="v of values"
        :key="v.label"
        class="pill bg-gray-200 dark:bg-gray-800"
      >
        <span class="text-gray-600 dark:text-gray-500">{{ v.label }}</span>
        <span class="text-gray-800 dark:text-gray-300 ml-1.5">{{
          v.value
        }}</span>
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { isFalsy } from 'fyo/utils';
import { Field } from 'schemas/types';
import { fyo } from 'src/initFyo';

const props = defineProps<{
  schemaName: string;
  name: string;
}>();

const values = ref<{ label: string; value: string }[]>([]);

const schema = computed(() => {
  return fyo.schemaMap[props.schemaName];
});

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
        label: f.label ?? '',
      };
    })
    .filter((i) => !!i.value);
}

watch(
  () => props.name,
  async (v1, v2) => {
    if (v1 === v2) {
      return;
    }
    await setValues();
  }
);

onMounted(async () => {
  await setValues();
});
</script>
