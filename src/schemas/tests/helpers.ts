import Account from '../app/Account.json';
import JournalEntry from '../app/JournalEntry.json';
import JournalEntryAccount from '../app/JournalEntryAccount.json';
import PartyRegional from '../regional/in/Party.json';
import { Schema, SchemaStub, SchemaStubMap } from '../types';
import Customer from './Customer.json';
import Party from './Party.json';

interface AppSchemaMap extends SchemaStubMap {
  Account: SchemaStub;
  JournalEntry: SchemaStub;
  JournalEntryAccount: SchemaStub;
  Party: SchemaStub;
  Customer: SchemaStub;
}

interface RegionalSchemaMap extends SchemaStubMap {
  Party: SchemaStub;
}

export function getTestSchemaMap(): {
  appSchemaMap: AppSchemaMap;
  regionalSchemaMap: RegionalSchemaMap;
} {
  const appSchemaMap: AppSchemaMap = {
    Account: Account as any as SchemaStub,
    JournalEntry: JournalEntry as any as SchemaStub,
    JournalEntryAccount: JournalEntryAccount as any as SchemaStub,
    Party: Party as any as SchemaStub,
    Customer: Customer,
  };

  const regionalSchemaMap: RegionalSchemaMap = {
    Party: PartyRegional as any as SchemaStub,
  };

  return structuredClone({
    appSchemaMap,
    regionalSchemaMap,
  });
}

export function everyFieldExists(fieldList: string[], schema: Schema): boolean {
  return fieldsExist(fieldList, schema, 'every');
}

export function someFieldExists(fieldList: string[], schema: Schema): boolean {
  return fieldsExist(fieldList, schema, 'some');
}

function fieldsExist(
  fieldList: string[],
  schema: Schema,
  type: 'every' | 'some'
): boolean {
  const schemaFieldNames = schema.fields.map((f) => f.fieldname);
  return fieldList.map((f) => schemaFieldNames.includes(f))[type](Boolean);
}

export function subtract(
  targetList: string[],
  ...removalLists: string[][]
): string[] {
  const removalList = removalLists.flat();
  return targetList.filter((f) => !removalList.includes(f));
}
