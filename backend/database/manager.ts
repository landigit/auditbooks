import path from 'node:path';
import BetterSQLite3 from 'better-sqlite3';
import fs from 'fs-extra';
import { DatabaseError } from 'fyo/utils/errors';
import { DatabaseDemuxBase, type DatabaseMethod } from 'utils/db/types';
import { getMapFromList } from 'utils/index';
import { Version } from 'utils/version';
import { getSchemas } from '../../schemas';
import { databaseMethodSet, unlinkIfExists } from '../helpers';
import patches from '../patches';
import { BespokeQueries } from './bespoke';
import DatabaseCore from './core';
import { runPatches } from './runPatch';
import type { BespokeFunction, Patch, RawCustomField } from './types';

export class DatabaseManager extends DatabaseDemuxBase {
  db?: DatabaseCore;
  rawCustomFields: RawCustomField[] = [];

  get #isInitialized(): boolean {
    return this.db !== undefined;
  }

  getSchemaMap() {
    if (this.#isInitialized) {
      return this.db?.schemaMap ?? getSchemas('-', this.rawCustomFields);
    }

    return getSchemas('-', this.rawCustomFields);
  }

  async createNewDatabase(dbPath: string, countryCode: string) {
    await unlinkIfExists(dbPath);
    return await this.connectToDatabase(dbPath, countryCode);
  }

  async connectToDatabase(dbPath: string, countryCode?: string) {
    const connectedCountryCode = await this._connect(dbPath, countryCode);
    await this.#migrate();
    return connectedCountryCode;
  }

  async _connect(dbPath: string, countryCode?: string) {
    let effectiveCountryCode = countryCode;
    effectiveCountryCode ??= await DatabaseCore.getCountryCode(dbPath);
    this.db = new DatabaseCore(dbPath);
    await this.db.connect();
    await this.setRawCustomFields();
    const schemaMap = getSchemas(effectiveCountryCode, this.rawCustomFields);
    this.db.setSchemaMap(schemaMap);
    return effectiveCountryCode;
  }

  async setRawCustomFields() {
    try {
      if (this.db) {
        this.rawCustomFields = (await this.db.getAll(
          'CustomField',
          {}
        )) as RawCustomField[];
      }
    } catch {
      this.rawCustomFields = [];
    }
  }

  async #migrate(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }

    const isFirstRun = await this.#getIsFirstRun();
    if (isFirstRun) {
      await this.db?.migrate();
    }

    await this.#executeMigration();
  }

  async #executeMigration() {
    const version = await this.#getAppVersion();
    const patches = await this.#getPatchesToExecute(version);

    const hasPatches = !!patches.pre.length || !!patches.post.length;
    if (hasPatches) {
      await this.#createBackup();
    }

    await runPatches(patches.pre, this, version);
    await this.db?.migrate({
      pre: async () => {
        if (hasPatches) {
          return;
        }

        await this.#createBackup();
      },
    });
    await runPatches(patches.post, this, version);
  }

  async #getPatchesToExecute(
    version: string
  ): Promise<{ pre: Patch[]; post: Patch[] }> {
    if (this.db === undefined) {
      return { pre: [], post: [] };
    }

    const query = (await this.db.getAll('PatchRun')) as {
      name: string;
      version?: string;
      failed?: boolean;
    }[];

    const runPatchesMap = getMapFromList(query, 'name');
    /**
     * A patch is run only if:
     * - it hasn't run and was added in a future version
     *    i.e. app version is before patch added version
     * - it ran but failed in some other version (i.e fixed)
     */
    const filtered = patches
      .filter((p) => {
        const exec = runPatchesMap[p.name];
        if (!exec && Version.lte(version, p.version)) {
          return true;
        }

        if (exec?.failed && exec?.version !== version) {
          return true;
        }

        return false;
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return {
      pre: filtered.filter((p) => p.patch.beforeMigrate),
      post: filtered.filter((p) => !p.patch.beforeMigrate),
    };
  }

  async call(method: DatabaseMethod, ...args: unknown[]) {
    if (!this.#isInitialized) {
      return;
    }

    if (!databaseMethodSet.has(method)) {
      return;
    }

    // biome-ignore lint/suspicious/noExplicitAny: library method demuxing
    const response = await (this.db as any)[method](...args);
    if (method === 'close') {
      this.db = undefined;
    }

    return response;
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.#isInitialized) {
      return;
    }

    if (!Object.hasOwn(BespokeQueries, method)) {
      throw new DatabaseError(`invalid bespoke db function ${method}`);
    }

    const queryFunction = BespokeQueries[
      method as keyof typeof BespokeQueries
    ] as (db: DatabaseCore, ...args: unknown[]) => Promise<unknown>;
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return await queryFunction(this.db, ...args);
  }

  async #getIsFirstRun(): Promise<boolean> {
    if (!this.db) {
      return true;
    }

    return !(await this.db.exists('PatchRun'));
  }

  async #createBackup() {
    const { dbPath } = this.db ?? {};
    if (!dbPath || process.env.IS_TEST) {
      return;
    }

    const backupPath = await this.#getBackupFilePath();
    if (!backupPath) {
      return;
    }

    const db = this.getDriver();
    await db?.backup(backupPath).then(() => db.close());
  }

  async #getBackupFilePath() {
    const { dbPath } = this.db ?? {};
    if (dbPath === ':memory:' || !dbPath) {
      return null;
    }

    let fileName = path.parse(dbPath).name;
    if (fileName.endsWith('.books')) {
      fileName = fileName.slice(0, -6);
    }

    const backupFolder = path.join(path.dirname(dbPath), 'backups');
    const date = new Date().toISOString().split('T')[0];
    const version = await this.#getAppVersion();
    const backupFile = `${fileName}_${version}_${date}.books.db`;
    fs.ensureDirSync(backupFolder);
    return path.join(backupFolder, backupFile);
  }

  async #getAppVersion(): Promise<string> {
    if (!this.db) {
      return '0.0.0';
    }

    const query = await this.db.getSingleValues({
      fieldname: 'version',
      parent: 'SystemSettings',
    });
    const value = (query[0] as undefined | { value: string })?.value;
    return value || '0.0.0';
  }

  getDriver() {
    const { dbPath } = this.db ?? {};
    if (!dbPath) {
      return null;
    }

    return BetterSQLite3(dbPath, { readonly: true });
  }
}

export default new DatabaseManager();
