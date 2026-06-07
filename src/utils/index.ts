/**
 * General purpose utils used by the frontend.
 */
import { t } from "fyo";
import { Doc } from "fyo/model/doc";
import { isPesa } from "fyo/utils";
import { BaseError, DuplicateEntryError, LinkValidationError } from "fyo/utils/errors";
import { Field, FieldType, FieldTypeEnum, NumberField } from "schemas/types";
import { fyo } from "src/initFyo";
import { safeGet, safeSet } from "utils/index";

export function stringifyCircular(
  obj: unknown,
  ignoreCircular = false,
  convertDocument = false,
): string {
  const cacheKey: string[] = [];
  const cacheValue: unknown[] = [];

  return JSON.stringify(obj, (key: string, value: unknown) => {
    if (typeof value !== "object" || value === null) {
      cacheKey.push(key);
      cacheValue.push(value);
      return value;
    }

    if (cacheValue.includes(value)) {
      const circularKey: string = cacheKey[cacheValue.indexOf(value)] || "{self}";
      return ignoreCircular ? undefined : `[Circular:${circularKey}]`;
    }

    cacheKey.push(key);
    cacheValue.push(value);

    if (convertDocument && value instanceof Doc) {
      return value.getValidDict();
    }

    return value;
  });
}

export function fuzzyMatch(input: string, target: string) {
  const inputLen = input.length;
  const targetLen = target.length;

  let i = 0;
  let j = 0;
  let distance = 0;

  while (i < inputLen && j < targetLen) {
    const inputChar = input[i];
    const targetChar = target[j];

    if (inputChar === targetChar) {
      i++;
    } else if (inputChar.toLowerCase() === targetChar.toLowerCase()) {
      i++;
      distance += 0.5;
    } else {
      distance += 1;
    }
    j++;
  }

  if (i < inputLen) {
    return { isMatch: false, distance: Number.MAX_SAFE_INTEGER };
  }

  distance += targetLen - j;
  return { isMatch: true, distance };
}

export function convertPesaValuesToFloat(obj: Record<string, unknown>) {
  Object.keys(obj).forEach((key) => {
    const value = safeGet(obj, key);
    if (!isPesa(value)) {
      return;
    }

    safeSet(obj, key, value.float);
  });
}

export function getErrorMessage(e: Error, doc?: Doc): string {
  const errorMessage = e.message || t`An error occurred.`;

  let { schemaName, name } = doc ?? {};
  if (!doc) {
    schemaName = (e as BaseError).more?.schemaName as string | undefined;
    name = (e as BaseError).more?.value as string | undefined;
  }

  if (!schemaName || !name) {
    return errorMessage;
  }

  const label = safeGet(fyo.db.schemaMap, schemaName)?.label ?? schemaName;
  if (e instanceof LinkValidationError) {
    return t`${label} ${name} is linked with existing records.`;
  } else if (e instanceof DuplicateEntryError) {
    return t`${label} ${name} already exists.`;
  }

  return errorMessage;
}

export function isNumeric(fieldtype: FieldType): fieldtype is NumberField["fieldtype"];
export function isNumeric(fieldtype: Field): fieldtype is NumberField;
export function isNumeric(
  fieldtype: Field | FieldType,
): fieldtype is NumberField | NumberField["fieldtype"] {
  if (typeof fieldtype !== "string") {
    fieldtype = fieldtype?.fieldtype;
  }

  const numericTypes: FieldType[] = [
    FieldTypeEnum.Int,
    FieldTypeEnum.Float,
    FieldTypeEnum.Currency,
  ];

  return numericTypes.includes(fieldtype);
}

export function truncate(str: string, options: { length: number; omission?: string }): string {
  const { length, omission = "..." } = options;
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length - omission.length) + omission;
}
