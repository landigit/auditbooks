/**
 * AuditLog Service — Maximum Coverage Edition
 *
 * Captures ALL document create / update / delete / rename events across every
 * schema in the app, plus system-level events (DB opened, DB closed/switched,
 * new DB created).
 *
 * Compliance: ISO 27001 | IT Act 2000 (India) | GDPR Art. 30
 *
 * Usage:
 *   setupAuditHooks(fyo)       — call after DB connects (every session)
 *   logSystemEvent(fyo, ...)   — call for DB-level events
 *   resetAuditHooks()          — call before DB switches (purgeCache)
 */

import { Fyo } from 'fyo';
import { ModelNameEnum } from 'models/types';

// ── Schemas excluded from audit logging ───────────────────────────────────────
// These are internal/low-level tables that would produce noise without value.
// AuditLog itself is excluded to prevent recursive loops.
const EXCLUDED_SCHEMAS = new Set([
  ModelNameEnum.AuditLog, // prevent recursive loop
  ModelNameEnum.PatchRun, // internal migration tracking
  ModelNameEnum.SingleValue, // raw key-value store — changes logged via parent schema
  'GetStarted', // onboarding checklist state
  'Misc', // internal open count etc.
]);

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Submit'
  | 'Cancel'
  | 'Rename'
  | 'DB_Opened'
  | 'DB_Created'
  | 'DB_Closed';

// ── SHA-256 checksum via Web Crypto API ───────────────────────────────────────
async function computeChecksum(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback: FNV-1a 32-bit hash (for environments without crypto.subtle)
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }
}

// ── Core write function ───────────────────────────────────────────────────────
async function writeAuditEntry(
  fyo: Fyo,
  action: AuditAction,
  schemaName: string,
  docName: string,
  changes?: unknown
): Promise<void> {
  try {
    // Guard: DB must be connected and the AuditLog table must exist
    if (!fyo.db.isConnected) return;

    const enableAuditTrail = fyo.singles?.SystemSettings?.enableAuditTrail;
    if (!enableAuditTrail) return;

    const now = new Date().toISOString();

    // Best-effort user identification — prefer email, fall back to company name
    const email = fyo.auth?.user;
    const company = fyo.singles?.AccountingSettings?.companyName as
      | string
      | undefined;
    const user = email || company || 'System';

    const changesStr = changes ? JSON.stringify(changes) : '';

    // Integrity hash: any tampering of any field will produce a different hash
    const checksumInput = `${now}|${action}|${schemaName}|${docName}|${user}|${changesStr}`;
    const checksum = await computeChecksum(checksumInput);

    await fyo.db.insert(ModelNameEnum.AuditLog, {
      timestamp: now,
      action,
      documentType: schemaName,
      documentName: String(docName ?? ''),
      user,
      changes: changesStr,
      checksum,
      created: now,
      modified: now,
      createdBy: user,
      modifiedBy: user,
    });
  } catch {
    // NEVER let audit failures surface to the user or break any operation
  }
}

// ── System-level events (DB open / close / create) ────────────────────────────
export function logSystemEvent(
  fyo: Fyo,
  action: 'DB_Opened' | 'DB_Created' | 'DB_Closed',
  dbPath: string
): void {
  writeAuditEntry(fyo, action, 'System', dbPath, null);
}

// ── Hook state ────────────────────────────────────────────────────────────────
let _hooksInstalled = false;

export function setupAuditHooks(fyo: Fyo): void {
  if (_hooksInstalled) return;
  _hooksInstalled = true;

  const observer = (
    fyo.db as unknown as {
      observer: {
        on: (event: string, cb: (...args: unknown[]) => void) => void;
      };
    }
  )?.observer;
  if (!observer) return;

  // Get every schema name currently registered in the DB
  const allSchemas = Object.keys(fyo.db.schemaMap ?? {});

  for (const schema of allSchemas) {
    // Skip excluded / internal schemas
    if (EXCLUDED_SCHEMAS.has(schema as ModelNameEnum)) continue;

    // Skip child tables (they are saved as part of their parent, not independently)
    const schemaDef = fyo.db.schemaMap[schema];
    if (schemaDef?.isChild) continue;
    if (schemaDef?.isSingle) {
      // Singles are saved via the parent schema event — skip raw SingleValue rows
      continue;
    }

    // ── insert → Create ─────────────────────────────────────────────────
    observer.on(`insert:${schema}`, (docValueMap: unknown) => {
      const doc = docValueMap as Record<string, unknown> | null;
      const name = String(doc?.name ?? '');
      writeAuditEntry(fyo, 'Create', schema, name, null);
    });

    // ── update → Update ─────────────────────────────────────────────────
    observer.on(`update:${schema}`, (docValueMap: unknown) => {
      const doc = docValueMap as Record<string, unknown> | null;
      const name = String(doc?.name ?? '');
      // Only capture a safe subset of fields (avoid logging sensitive values in bulk)
      const summary = doc
        ? Object.fromEntries(
            Object.entries(doc).filter(([k]) =>
              [
                'name',
                'status',
                'date',
                'modified',
                'modifiedBy',
                'submitted',
                'cancelled',
              ].includes(k)
            )
          )
        : null;
      writeAuditEntry(fyo, 'Update', schema, name, summary);
    });

    // ── delete → Delete ─────────────────────────────────────────────────
    observer.on(`delete:${schema}`, (name: unknown) => {
      writeAuditEntry(fyo, 'Delete', schema, String(name ?? ''), null);
    });

    // ── rename → Rename ─────────────────────────────────────────────────
    observer.on(`rename:${schema}`, (data: unknown) => {
      const d = data as { oldName?: string; newName?: string } | null;
      writeAuditEntry(fyo, 'Rename', schema, String(d?.newName ?? ''), {
        from: d?.oldName,
        to: d?.newName,
      });
    });
  }
}

/**
 * Call this before fyo.purgeCache() when switching databases.
 * This resets the flag so hooks are re-installed on the new DB.
 */
export function resetAuditHooks(): void {
  _hooksInstalled = false;
}
