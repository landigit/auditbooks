<template>
  <div ref="container" class="bg-surface text-main"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, markRaw } from 'vue';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { vue } from '@codemirror/lang-vue';
import {
  HighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
// @ts-ignore
import { tags } from '@lezer/highlight';
import { basicSetup } from 'codemirror';
import { useAppStore } from 'src/stores/app';

// Define Props
const props = withDefaults(
  defineProps<{
    initialValue: string;
    disabled?: boolean;
    hints?: Record<string, unknown>;
  }>(),
  {
    disabled: false,
    hints: undefined,
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'input', value: string): void;
  (e: 'blur', value: string): void;
}>();

// Template Refs
const container = ref<HTMLDivElement | null>(null);

// Reactive State
const editorState = ref<EditorState | null>(null);
const view = ref<EditorView | null>(null);
const compartments = ref<Record<string, Compartment>>({});
const store = useAppStore();

// Methods
const updateListener = (update: ViewUpdate) => {
  if (update.docChanged) {
    emit('input', view.value?.state.doc.toString() ?? '');
  }

  if (update.focusChanged && !view.value?.hasFocus) {
    emit('blur', view.value?.state.doc.toString() ?? '');
  }
};

const setDisabled = (value: boolean) => {
  const { readOnly, editable } = compartments.value;
  view.value?.dispatch({
    effects: [
      readOnly.reconfigure(EditorState.readOnly.of(value)),
      editable.reconfigure(EditorView.editable.of(!value)),
    ],
  });
};

const init = () => {
  const readOnly = new Compartment();
  const editable = new Compartment();

  const highlightStyle = HighlightStyle.define([
    { tag: tags.typeName, color: 'var(--color-syntax-type)' },
    { tag: tags.angleBracket, color: 'var(--color-syntax-angle)' },
    { tag: tags.attributeName, color: 'var(--color-syntax-attr-name)' },
    { tag: tags.attributeValue, color: 'var(--color-syntax-attr-value)' },
    {
      tag: tags.comment,
      color: 'var(--color-syntax-comment)',
      fontStyle: 'italic',
    },
    { tag: tags.keyword, color: 'var(--color-syntax-keyword)' },
    { tag: tags.variableName, color: 'var(--color-syntax-variable)' },
    { tag: tags.string, color: 'var(--color-syntax-string)' },
  ]);
  const completions = getCompletionsFromHints(props.hints ?? {});

  if (!container.value) {
    throw new Error('container is not initialized');
  }

  const editorView = new EditorView({
    doc: props.initialValue,
    extensions: [
      EditorView.updateListener.of(updateListener),
      readOnly.of(EditorState.readOnly.of(props.disabled)),
      editable.of(EditorView.editable.of(!props.disabled)),
      basicSetup,
      vue(),
      syntaxHighlighting(highlightStyle),
      autocompletion({ override: [completions] }),
    ],
    parent: container.value,
  });
  view.value = markRaw(editorView);

  const comps = { readOnly, editable };
  compartments.value = markRaw(comps);
};

// Watchers
watch(
  () => props.disabled,
  (value: boolean) => {
    setDisabled(value);
  }
);

// Lifecycles
onMounted(() => {
  if (!view.value) {
    init();
  }

  if (store.isDevelopment) {
    // @ts-ignore
    window.te = {
      editorState,
      view,
      compartments,
      init,
      updateListener,
      setDisabled,
    };
  }
});

// CodeMirror completions helpers
function getCompletionsFromHints(hints: Record<string, unknown>) {
  const options = hintsToCompletionOptions(hints);
  return function completions(context: CompletionContext) {
    let word = context.matchBefore(/\w*/);
    if (word == null) {
      return null;
    }

    const node = syntaxTree(context.state).resolveInner(context.pos);
    const aptLocation = ['ScriptAttributeValue', 'SingleExpression'];

    if (!aptLocation.includes(node.name)) {
      return null;
    }

    if (word.from === word.to && !context.explicit) {
      return null;
    }

    return {
      from: word.from,
      options,
    };
  };
}

type CompletionOption = {
  label: string;
  type: string;
  detail: string;
};

function hintsToCompletionOptions(
  hints: object,
  prefix?: string
): CompletionOption[] {
  prefix ??= '';
  const list: CompletionOption[] = [];

  for (const [key, value] of Object.entries(hints)) {
    const option = getCompletionOption(key, value, prefix);
    if (option === null) {
      continue;
    }

    if (Array.isArray(option)) {
      list.push(...option);
      continue;
    }

    list.push(option);
  }

  return list;
}

function getCompletionOption(
  key: string,
  value: unknown,
  prefix: string
): null | CompletionOption | CompletionOption[] {
  let label = key;
  if (prefix.length) {
    label = prefix + '.' + key;
  }

  if (Array.isArray(value)) {
    return {
      label,
      type: 'variable',
      detail: 'Child Table',
    };
  }

  if (typeof value === 'string') {
    return {
      label,
      type: 'variable',
      detail: value,
    };
  }

  if (typeof value === 'object' && value !== null) {
    return hintsToCompletionOptions(value, label);
  }

  return null;
}
</script>

<style>
@reference "../../styles/index.css";
.cm-line {
  font-weight: 600;
}

.cm-gutter {
  background-color: var(--color-canvas-muted);
}

.cm-gutters {
  border: none !important;
  border-right: 1px solid var(--color-border) !important;
}

.cm-activeLine,
.cm-activeLineGutter {
  background-color: var(--color-surface-hover) !important;
}

.cm-tooltip-autocomplete {
  background-color: var(--color-surface) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 0.25rem;
  box-shadow: var(--shadow-autocomplete);
  overflow: hidden;
  color: var(--color-main);
}

.cm-panels {
  border-top: 1px solid var(--color-border) !important;
  background-color: var(--color-canvas-muted) !important;
  color: var(--color-main) !important;
}

.cm-button {
  background-image: none !important;
  background-color: var(--color-surface-hover) !important;
  color: var(--color-main) !important;
  border: none !important;
}

.cm-textfield {
  border: 1px solid var(--color-border) !important;
}
</style>
