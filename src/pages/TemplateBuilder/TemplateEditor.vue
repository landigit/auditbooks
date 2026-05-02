<template>
  <div ref="container" class="bg-surface text-main"></div>
</template>
<script lang="ts">
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
import { defineComponent, markRaw } from 'vue';

export default defineComponent({
  props: {
    initialValue: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    hints: { type: Object, default: undefined },
  },
  emits: ['input', 'blur'],
  data() {
    return {
      state: null as EditorState | null,
      view: null as EditorView | null,
      compartments: {} as Record<string, Compartment>,
    };
  },
  computed: {
    container() {
      const { container } = this.$refs;
      if (container instanceof HTMLDivElement) {
        return container;
      }

      throw new Error('ref container is not a div element');
    },
  },
  watch: {
    disabled(value: boolean) {
      this.setDisabled(value);
    },
  },
  mounted() {
    if (!this.view) {
      this.init();
    }

    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.te = this;
    }
  },
  methods: {
    init() {
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
      const completions = getCompletionsFromHints(this.hints ?? {});

      const view = new EditorView({
        doc: this.initialValue,
        extensions: [
          EditorView.updateListener.of(this.updateListener.bind(this)),
          readOnly.of(EditorState.readOnly.of(this.disabled)),
          editable.of(EditorView.editable.of(!this.disabled)),
          basicSetup,
          vue(),
          syntaxHighlighting(highlightStyle),
          autocompletion({ override: [completions] }),
        ],
        parent: this.container,
      });
      this.view = markRaw(view);

      const compartments = { readOnly, editable };
      this.compartments = markRaw(compartments);
    },
    updateListener(update: ViewUpdate) {
      if (update.docChanged) {
        this.$emit('input', this.view?.state.doc.toString() ?? '');
      }

      if (update.focusChanged && !this.view?.hasFocus) {
        this.$emit('blur', this.view?.state.doc.toString() ?? '');
      }
    },
    setDisabled(value: boolean) {
      const { readOnly, editable } = this.compartments;
      this.view?.dispatch({
        effects: [
          readOnly.reconfigure(EditorState.readOnly.of(value)),
          editable.reconfigure(EditorView.editable.of(!value)),
        ],
      });
    },
  },
});

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
