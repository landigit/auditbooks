<template>
  <div
    class="flex flex-col items-center justify-center h-full w-full bg-gray-25 dark:bg-gray-875 text-sm text-gray-500 p-6"
  >
    <div v-if="error" class="text-red-500 text-center font-semibold max-w-md">
      <p class="mb-2">Error resolving template:</p>
      <p
        class="text-xs font-mono bg-red-50 dark:bg-red-950 p-3 rounded border border-red-200 dark:border-red-800"
      >
        {{ error }}
      </p>
    </div>
    <div v-else>
      {{ t`Loading layout designer...` }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { fyo } from 'src/initFyo';
import { ModelNameEnum } from 'models/types';
import { useApp } from 'src/composables/useApp';

const props = defineProps<{ name: string }>();
const router = useRouter();
const { t } = useApp();
const error = ref<string | null>(null);

async function resolve(templateName: string) {
  try {
    error.value = null;
    console.log('Resolving template:', templateName);
    const templateDoc = await fyo.doc.getDoc(
      ModelNameEnum.PrintTemplate,
      templateName
    );
    console.log('Found templateDoc:', templateDoc);
    const targetSchema = templateDoc.get('type') as string;
    console.log('Target schema:', targetSchema);

    if (targetSchema) {
      // Find the latest document name of that schema type
      const latestDocs = await fyo.db.getAllRaw(targetSchema, {
        limit: 1,
        orderBy: 'modified',
        order: 'desc',
      });
      console.log('Latest docs found:', latestDocs);

      const sampleDocName = latestDocs[0] ? String(latestDocs[0].name) : 'new';
      console.log(
        'Redirecting to invoice designer with sample:',
        sampleDocName
      );

      router.replace(
        `/invoice-designer/${targetSchema}/${encodeURIComponent(sampleDocName)}?templateName=${encodeURIComponent(templateName)}`
      );
    } else {
      console.log('No target schema, redirecting to /');
      router.replace('/');
    }
  } catch (err: any) {
    console.error('Failed to resolve template builder:', err);
    error.value = err?.message || String(err);
  }
}

watch(
  () => props.name,
  (newName) => {
    if (newName) {
      resolve(newName);
    }
  },
  { immediate: true }
);

onActivated(() => {
  if (props.name) {
    resolve(props.name);
  }
});
</script>
