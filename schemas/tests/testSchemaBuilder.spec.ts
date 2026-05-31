import { describe, expect, test } from 'bun:test';
import { getMapFromList } from 'utils';
import {
  addMetaFields,
  cleanSchemas,
  getAbstractCombinedSchemas,
  getRegionalCombinedSchemas,
  setSchemaNameOnFields,
} from '../index';
import { metaSchemas } from '../schemas';
import {
  everyFieldExists,
  getTestSchemaMap,
  someFieldExists,
  subtract,
} from './helpers';

const { appSchemaMap, regionalSchemaMap } = getTestSchemaMap();

describe('Schema Builder Tests', () => {
  test('Meta Properties', () => {
    expect(appSchemaMap.Party.isAbstract).toBe(true);
    expect(appSchemaMap.Customer.extends).toBe('Party');
    expect(appSchemaMap.Account.isTree).toBe(true);
    expect(appSchemaMap.JournalEntryAccount.isChild).toBe(true);
  });

  test('Field Counts', () => {
    expect(appSchemaMap.Account.fields?.length).toBe(5);
    expect(appSchemaMap.JournalEntry.fields?.length).toBe(9);
    expect(appSchemaMap.JournalEntryAccount.fields?.length).toBe(3);
    expect(appSchemaMap.Party.fields?.length).toBe(9);
    expect(appSchemaMap.Customer.fields?.length).toBeUndefined();
    expect(regionalSchemaMap.Party.fields?.length).toBe(2);
  });

  test('Quick Edit Field Counts', () => {
    expect(appSchemaMap.Party.quickEditFields?.length).toBe(5);
    expect(regionalSchemaMap.Party.quickEditFields?.length).toBe(8);
  });

  const regionalCombined = getRegionalCombinedSchemas(
    appSchemaMap,
    regionalSchemaMap
  );

  test('Field Counts Combined', () => {
    expect(regionalCombined.Party.fields?.length).toBe(11);
  });

  test('Quick Edit Field Counts Combined', () => {
    expect(regionalSchemaMap.Party.quickEditFields?.length).toBe(8);
  });

  test('Schema Equality with App Schemas', () => {
    expect(regionalCombined.Account).toEqual(appSchemaMap.Account);
    expect(regionalCombined.JournalEntry).toEqual(appSchemaMap.JournalEntry);
    expect(regionalCombined.JournalEntryAccount).toEqual(
      appSchemaMap.JournalEntryAccount
    );
    expect(regionalCombined.Customer).toEqual(appSchemaMap.Customer);
    expect(regionalCombined.Party).not.toEqual(appSchemaMap.Party);
  });

  const abstractCombined = cleanSchemas(
    getAbstractCombinedSchemas(regionalCombined)
  );

  test('Meta Properties Abstract', () => {
    expect(abstractCombined.Customer!.extends).toBeUndefined();
  });

  test('Abstract Schema Existence', () => {
    expect(abstractCombined.Party).toBeUndefined();
  });

  test('Field Counts Abstract', () => {
    expect(abstractCombined.Customer!.fields?.length).toBe(11);
  });

  test('Quick Edit Field Counts Abstract', () => {
    expect(abstractCombined.Customer!.quickEditFields?.length).toBe(8);
  });

  test('Schema Equality with App Schemas Abstract', () => {
    expect(abstractCombined.Account as any).toEqual(appSchemaMap.Account);
    expect(abstractCombined.JournalEntry as any).toEqual(
      appSchemaMap.JournalEntry
    );
    expect(abstractCombined.JournalEntryAccount as any).toEqual(
      appSchemaMap.JournalEntryAccount
    );
    expect(abstractCombined.Customer).not.toEqual(appSchemaMap.Customer);
  });

  test('Schema Field Existence', () => {
    expect(
      everyFieldExists(
        regionalSchemaMap.Party.quickEditFields ?? [],
        abstractCombined.Customer!
      )
    ).toBe(true);
  });

  const almostFinalSchemas = structuredClone(abstractCombined);
  const withMeta = addMetaFields(almostFinalSchemas);
  const finalSchemas = setSchemaNameOnFields(withMeta);
  const metaSchemaMap = getMapFromList(metaSchemas, 'name');
  const baseFieldNames = metaSchemaMap.base.fields!.map((f) => f.fieldname);
  const childFieldNames = metaSchemaMap.child.fields!.map((f) => f.fieldname);
  const treeFieldNames = metaSchemaMap.tree.fields!.map((f) => f.fieldname);
  const submittableFieldNames = metaSchemaMap.submittable.fields!.map(
    (f) => f.fieldname
  );
  const allFieldNames = [
    ...baseFieldNames,
    ...childFieldNames,
    ...treeFieldNames,
    ...submittableFieldNames,
  ];

  test('Schema Name Existence', () => {
    for (const schemaName in finalSchemas) {
      for (const field of finalSchemas[schemaName]?.fields!) {
        expect(field.schemaName).toBe(schemaName);
      }
    }
  });

  test('Final Schema Field Existence', () => {
    expect(everyFieldExists(baseFieldNames, finalSchemas.Customer!)).toBe(true);

    expect(
      someFieldExists(
        subtract(allFieldNames, baseFieldNames),
        finalSchemas.Customer!
      )
    ).toBe(false);

    expect(
      everyFieldExists(
        [...baseFieldNames, ...submittableFieldNames],
        finalSchemas.JournalEntry!
      )
    ).toBe(true);

    expect(
      someFieldExists(
        subtract(allFieldNames, baseFieldNames, submittableFieldNames),
        finalSchemas.JournalEntry!
      )
    ).toBe(false);

    expect(
      everyFieldExists(childFieldNames, finalSchemas.JournalEntryAccount!)
    ).toBe(true);

    expect(
      someFieldExists(
        subtract(allFieldNames, childFieldNames),
        finalSchemas.JournalEntryAccount!
      )
    ).toBe(false);

    expect(
      everyFieldExists(
        [...treeFieldNames, ...baseFieldNames],
        finalSchemas.Account!
      )
    ).toBe(true);

    expect(
      someFieldExists(
        subtract(allFieldNames, treeFieldNames, baseFieldNames),
        finalSchemas.Account!
      )
    ).toBe(false);
  });
});
