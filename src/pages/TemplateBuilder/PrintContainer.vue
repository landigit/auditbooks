<template>
  <ScaledContainer
    ref="scaledContainer"
    :scale="Math.max(scale, 0.1)"
    :width="width"
    :height="height"
    :show-overflow="true"
    class="mx-auto shadow-lg"
  >
    <ErrorBoundary
      v-if="!error"
      :propagate="false"
      @error-captured="handleErrorCaptured"
    >
      <!-- Template -->
      <component
        :is="templateComponent"
        class="flex-1 bg-surface"
        :doc="values.doc"
        :print="values.print"
      />
    </ErrorBoundary>

    <!-- Compilation Error -->
    <div
      v-else
      class="h-full bg-indicator-red-bg w-full text-2xl text-main flex flex-col gap-4"
    >
      <h1 class="text-4xl font-bold text-error p-4 border-b border-error">
        {{ error.name }}
      </h1>
      <p class="px-4 font-semibold">{{ error.message }}</p>
      <pre v-if="error.detail" class="px-4 text-xl text-description">{{
        error.detail
      }}</pre>
    </div>
  </ScaledContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
  compile as compilerCompile,
  CompilerError,
  generateCodeFrame,
  SourceLocation,
} from '@vue/compiler-dom';
import { Verb } from 'fyo/telemetry/types';
import ErrorBoundary from 'src/components/ErrorBoundary.vue';
import { getPathAndMakePDF } from 'src/utils/printTemplates';
import { PrintValues } from 'src/utils/types';
import ScaledContainer from './ScaledContainer.vue';
import { fyo } from 'src/initFyo';
import { t } from 'fyo';

const baseSafeTemplate = `<main class="h-full w-full bg-surface">
  <p class="p-4 text-indicator-red-text">
    <span class="font-bold">ERROR</span>: Template failed to load due to errors.
  </p>
</main>
`;

// Define Props
const props = withDefaults(
  defineProps<{
    template: string;
    printSchemaName: string;
    scale?: number;
    width?: number;
    height?: number;
    values: PrintValues;
  }>(),
  {
    scale: 0.65,
    width: 21,
    height: 29.7,
  }
);

// Template Refs
const scaledContainer = ref<InstanceType<typeof ScaledContainer> | null>(null);

// Reactive State
const error = ref<{ name: string; message: string; detail?: string } | null>(null);

// Computed Properties
const templateComponent = computed(() => {
  let templateHtml = props.template;
  if (error.value) {
    templateHtml = baseSafeTemplate;
  }

  return {
    template: templateHtml,
    props: ['doc', 'print'],
    computed: {
      fyo() {
        return {};
      },
      platform() {
        return '';
      },
    },
  };
});

// Methods
const getCodeFrame = (loc: SourceLocation) => {
  return generateCodeFrame(props.template, loc.start.offset, loc.end.offset);
};

const onError = (compilerError: CompilerError) => {
  const codeframe = compilerError.loc ? getCodeFrame(compilerError.loc) : '';

  error.value = {
    name: t`Template Compilation Error`,
    detail: codeframe,
    message: compilerError.message,
  };
};

const compile = (templateString: string) => {
  error.value = null;
  return compilerCompile(templateString, {
    hoistStatic: true,
    onWarn: onError,
    onError: onError,
  });
};

const handleErrorCaptured = (err: unknown) => {
  if (!(err instanceof Error)) {
    throw err;
  }

  const message = err.message;
  let name = err.name;
  let detail = '';
  if (name === 'TypeError' && message.includes('Cannot read')) {
    name = t`Invalid Key Error`;
    detail = t`Please check Key Hints for valid key names`;
  }

  error.value = { name, message, detail };
};

const savePDF = async (name?: string, shouldPrint?: boolean) => {
  const innerHTML = scaledContainer.value?.$el.children[0].innerHTML;
  if (typeof innerHTML !== 'string') {
    return;
  }

  await getPathAndMakePDF(
    name ?? t`Entry`,
    innerHTML,
    props.width,
    props.height,
    props.values.print.font as string,
    shouldPrint
  );

  fyo.telemetry.log(Verb.Printed, props.printSchemaName);
};

// Expose public methods
defineExpose({
  savePDF,
});

// Watchers
watch(() => props.template, (value: string) => {
  compile(value);
});

// Lifecycles
onMounted(() => {
  compile(props.template);
});
</script>
