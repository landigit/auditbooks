import { inject } from 'vue';
import {
  useFieldError,
  useIsFieldDirty,
  useIsFieldTouched,
  useIsFieldValid,
} from 'vee-validate';

export function useFormField() {
  const fieldName = inject('FORM_FIELD_NAME') as string;
  const formItemId = inject('FORM_ITEM_ID') as string;

  if (!fieldName) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const error = useFieldError(fieldName);
  const isDirty = useIsFieldDirty(fieldName);
  const isTouched = useIsFieldTouched(fieldName);
  const isValid = useIsFieldValid(fieldName);

  return {
    id: formItemId,
    name: fieldName,
    formItemId: `${formItemId}-form-item`,
    formDescriptionId: `${formItemId}-form-item-description`,
    formMessageId: `${formItemId}-form-item-message`,
    error,
    isDirty,
    isTouched,
    isValid,
  };
}
