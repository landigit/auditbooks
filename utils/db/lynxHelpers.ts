/**
 * utils/db/lynxHelpers.ts
 *
 * Pure-JS exports shared between the server-side DatabaseCore (backend/helpers.ts)
 * and the client-side LynxDemux (fyo/demux/dbLynx.ts).
 *
 * IMPORTANT: This file must NOT import any Node.js built-ins (fs, path, etc.)
 * so that it can be safely bundled by rspeedy for the Lynx / browser target.
 */

export const SYSTEM = '__SYSTEM__';

/** Maps Frappe/Fyo field types to their SQLite storage types. */
export const sqliteTypeMap: Record<string, string> = {
  AutoComplete: 'text',
  Currency: 'text',
  Int: 'integer',
  Float: 'float',
  Percent: 'float',
  Check: 'boolean',
  Code: 'text',
  Date: 'date',
  Datetime: 'datetime',
  Time: 'time',
  Text: 'text',
  Data: 'text',
  Secret: 'text',
  Link: 'text',
  DynamicLink: 'text',
  Password: 'text',
  Select: 'text',
  Attachment: 'text',
  AttachImage: 'text',
  Color: 'text',
};

/** Returns a minimal meta-field map for new records. */
export function getDefaultMetaFieldValueMap() {
  const now = new Date().toISOString();
  return {
    createdBy: SYSTEM,
    modifiedBy: SYSTEM,
    created: now,
    modified: now,
  };
}
