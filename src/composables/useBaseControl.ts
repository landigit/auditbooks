import { computed, inject, Ref } from 'vue';
import { Doc } from 'fyo/model/doc';
import { Field, FieldTypeEnum } from 'schemas/types';
import { evaluateReadOnly, evaluateRequired } from 'src/utils/doc';
import { getIsNullOrUndef } from 'utils/index';

export function isNumeric(fieldtype: any): boolean {
  if (fieldtype && typeof fieldtype !== 'string') {
    fieldtype = fieldtype.fieldtype;
  }
  return [
    FieldTypeEnum.Int,
    FieldTypeEnum.Float,
    FieldTypeEnum.Currency,
  ].includes(fieldtype);
}

export interface BaseControlProps {
  df: Field;
  step?: number;
  value?: string | number | boolean | Record<string, any> | unknown[] | null;
  inputClass?: string | string[];
  border?: boolean;
  size?: string;
  placeholder?: string;
  showLabel?: boolean;
  containerStyles?: Record<string, any>;
  textRight?: boolean | null;
  readOnly?: boolean | null;
  required?: boolean | null;
  inputType?: string;
  parse?: (val: any) => any;
}

export function useBaseControl(
  props: BaseControlProps,
  emit: (event: any, ...args: any[]) => void,
  inputRef: Ref<HTMLElement | null>
) {
  const injectedDoc = inject<unknown>('doc', undefined);

  const doc = computed<Doc | undefined>(() => {
    if (injectedDoc instanceof Doc) {
      return injectedDoc;
    }
    return undefined;
  });

  const inputType = computed<string>(() => props.inputType || 'text');

  const labelClasses = computed<string>(() => 'text-description text-sm mb-1');

  const baseInputClasses = computed<string[]>(() => [
    'text-base',
    'focus:outline-none',
    'w-full',
    'placeholder-description',
  ]);

  const sizeClasses = computed<string>(() => {
    if (props.size === 'small') {
      return 'px-2 py-1';
    }
    return 'px-3 py-2';
  });

  const isReadOnly = computed<boolean>(() => {
    if (typeof props.readOnly === 'boolean') {
      return props.readOnly;
    }
    return evaluateReadOnly(props.df, doc.value);
  });

  const inputReadOnlyClasses = computed<string>(() => {
    if (isReadOnly.value) {
      return 'text-description cursor-default';
    }
    return 'text-main';
  });

  function getInputClassesFromProp(classes: string[]) {
    if (!props.inputClass) {
      return classes;
    }
    let inputClass = props.inputClass;
    if (typeof inputClass === 'string') {
      inputClass = [inputClass];
    }
    inputClass = inputClass.filter((i) => typeof i === 'string');
    return [classes, inputClass].flat();
  }

  const inputClasses = computed<string[]>(() => {
    const classes: string[] = [];
    classes.push(...baseInputClasses.value);
    if (props.textRight ?? isNumeric(props.df)) {
      classes.push('text-end');
    }
    classes.push(sizeClasses.value);
    classes.push(inputReadOnlyClasses.value);
    return getInputClassesFromProp(classes).filter(Boolean);
  });

  const baseContainerClasses = computed<string[]>(() => ['rounded']);

  const containerReadOnlyClasses = computed<string>(() => {
    if (!isReadOnly.value) {
      return 'focus-within:bg-surface-hover';
    }
    return '';
  });

  const borderClasses = computed<string>(() => {
    if (!props.border) {
      return '';
    }
    const border = 'border border-border';
    let background = 'bg-canvas';
    if (isReadOnly.value) {
      background = 'bg-canvas-muted';
    }
    return border + ' ' + background;
  });

  const containerClasses = computed<string[]>(() => {
    const classes: string[] = [];
    classes.push(...baseContainerClasses.value);
    classes.push(containerReadOnlyClasses.value);
    classes.push(borderClasses.value);
    return classes.filter(Boolean);
  });

  const inputPlaceholder = computed<string>(() => {
    return props.placeholder || props.df.placeholder || props.df.label;
  });

  const isEmpty = computed<boolean>(() => {
    if (Array.isArray(props.value) && !props.value.length) {
      return true;
    }
    if (typeof props.value === 'string' && !props.value) {
      return true;
    }
    if (getIsNullOrUndef(props.value)) {
      return true;
    }
    return false;
  });

  const isRequired = computed<boolean>(() => {
    if (typeof props.required === 'boolean') {
      return props.required;
    }
    return evaluateRequired(props.df, doc.value);
  });

  const showMandatory = computed<boolean>(() => {
    return isEmpty.value && isRequired.value;
  });

  function parse(val: unknown): unknown {
    if (props.parse) {
      return props.parse(val);
    }
    return val;
  }

  function triggerChange(val: unknown): void {
    val = parse(val);
    if (val === '') {
      val = null;
    }
    emit('change', val);
  }

  function onBlur(e: FocusEvent) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target) return;
    
    if (isReadOnly.value) {
      return;
    }
    triggerChange(target.value);
  }

  function focus(): void {
    if (inputRef.value) {
      inputRef.value.focus();
    }
  }

  return {
    doc,
    inputType,
    labelClasses,
    baseInputClasses,
    sizeClasses,
    isReadOnly,
    inputReadOnlyClasses,
    inputClasses,
    baseContainerClasses,
    containerReadOnlyClasses,
    borderClasses,
    containerClasses,
    inputPlaceholder,
    isEmpty,
    isRequired,
    showMandatory,
    onBlur,
    getInputClassesFromProp,
    focus,
    triggerChange,
    parse,
    isNumeric
  };
}
