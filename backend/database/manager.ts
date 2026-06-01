import fs from 'fs';
import { DatabaseError } from 'fyo/utils/errors';
import path from 'path';
import pkg from '../../package.json';
import { DatabaseDemuxBase, DatabaseMethod } from 'src/utils/db/types';
import { getMapFromList } from 'src/utils/core/index';
import { Version } from 'src/utils/core/version';
import { getSchemas } from '../../src/schemas';
import { databaseMethodSet, unlinkIfExists } from '../helpers';
import patches from '../patches';
import { BespokeQueries } from './bespoke';
import DatabaseCore from './core';
import { runPatches } from './runPatch';
import { BespokeFunction, Patch, RawCustomField } from './types';

export class DatabaseManager extends DatabaseDemuxBase {
  db?: DatabaseCore;
  rawCustomFields: RawCustomField[] = [];

  get #isInitialized(): boolean {
    return this.db !== undefined && this.db.client !== undefined;
  }

  getSchemaMap() {
    if (this.#isInitialized) {
      return this.db?.schemaMap ?? getSchemas('-', this.rawCustomFields);
    }

    return getSchemas('-', this.rawCustomFields);
  }

  async createNewDatabase(dbPath: string, countryCode: string) {
    if (this.db) {
      await this.call('close');
    }
    await unlinkIfExists(dbPath);
    return await this.connectToDatabase(dbPath, countryCode);
  }

  async connectToDatabase(dbPath: string, countryCode?: string) {
    if (this.db) {
      await this.call('close');
    }
    countryCode = await this._connect(dbPath, countryCode);
    await this.#migrate();
    return countryCode;
  }

  async _connect(dbPath: string, countryCode?: string) {
    countryCode ??= await DatabaseCore.getCountryCode(dbPath);
    this.db = new DatabaseCore(dbPath);
    await this.db.connect();
    await this.setRawCustomFields();
    const schemaMap = getSchemas(countryCode, this.rawCustomFields);
    this.db.setSchemaMap(schemaMap);
    return countryCode;
  }

  async setRawCustomFields() {
    try {
      this.rawCustomFields = (await this.db?.getAll(
        'CustomField'
      )) as RawCustomField[];
    } catch {}
  }

  async #migrate(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }

    const isFirstRun = await this.#getIsFirstRun();
    if (isFirstRun) {
      await this.db!.migrate();
    }

    await this.#executeMigration(isFirstRun);
  }

  async #executeMigration(isFirstRun?: boolean) {
    isFirstRun ??= await this.#getIsFirstRun();
    let version = '0.0.0';

    if (isFirstRun) {
      try {
        version = pkg.version || '0.37.8';
      } catch {
        version = '0.37.8';
      }

      try {
        const now = new Date().toISOString();
        await this.db!.client!.execute({
          sql: `INSERT OR REPLACE INTO "SingleValue" (name, parent, fieldname, value, createdBy, modifiedBy, created, modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `SystemSettings.version`,
            'SystemSettings',
            'version',
            version,
            '__SYSTEM__',
            '__SYSTEM__',
            now,
            now,
          ],
        });
      } catch (err) {
        console.error('Failed to set initial version:', err);
      }
    } else {
      version = await this.#getAppVersion();
    }

    const patches = await this.#getPatchesToExecute(version);

    const hasPatches = !!patches.pre.length || !!patches.post.length;
    if (hasPatches) {
      await this.#createBackup();
    }

    await runPatches(patches.pre, this, version);
    await this.db!.migrate({
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

    const query = (await this.db.getAll('PatchRun', {
      fields: ['name', 'version', 'failed'],
    })) as {
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
        const exec = Reflect.get(runPatchesMap, p.name);
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

    // @ts-ignore
    const response = await Reflect.get(this.db, method).call(this.db, ...args);
    if (method === 'close') {
      delete this.db;
    }

    return response;
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.#isInitialized) {
      return;
    }

    if (!BespokeQueries.hasOwnProperty(method)) {
      throw new DatabaseError(`invalid bespoke db function ${method}`);
    }

    const queryFunction: BespokeFunction = Reflect.get(
      BespokeQueries,
      method as keyof BespokeFunction
    );
    return await queryFunction(this.db!, ...args);
  }

  async #getIsFirstRun(): Promise<boolean> {
    if (!this.db || !this.db.client) {
      return true;
    }
    try {
      const res = await this.db.client.execute({
        sql: "select count(*) as count from sqlite_master where type='table' and name='PatchRun'",
        args: [],
      });
      return Number(res.rows[0]?.count) === 0;
    } catch {
      return true;
    }
  }

  async #createBackup() {
    const { dbPath } = this.db ?? {};
    if (!dbPath || process.env.IS_TEST || !this.db?.client) {
      return;
    }

    const backupPath = await this.#getBackupFilePath();
    if (!backupPath) {
      return;
    }

    // Delete any existing file at backupPath to prevent sqlite error
    await unlinkIfExists(backupPath);

    try {
      await this.db.client.execute({
        sql: `VACUUM INTO ?`,
        args: [backupPath],
      });
    } catch (err) {
      // Fallback: Copy database file directly if VACUUM INTO is not supported or fails
      try {
        await fs.promises.copyFile(dbPath, backupPath);
      } catch (copyErr) {
        console.error('Failed to create backup:', copyErr);
      }
    }
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

    const resolvedDbPath = path.normalize(path.resolve(dbPath));
    const baseDir = path.dirname(resolvedDbPath);
    const backupFolder = path.normalize(path.resolve(baseDir, 'backups'));
    if (!backupFolder.startsWith(baseDir)) {
      throw new Error('Path traversal detected');
    }
    const date = new Date().toISOString().split('T')[0];
    const version = await this.#getAppVersion();
    const backupFile = `${fileName}_${version}_${date}.db`;
    fs.mkdirSync(backupFolder, { recursive: true });
    return path.normalize(path.resolve(backupFolder, backupFile));
  }

  async #getAppVersion(): Promise<string> {
    if (!this.db || !this.db.client) {
      return '0.0.0';
    }

    const query = await this.db.getSingleValues({
      fieldname: 'version',
      parent: 'SystemSettings',
    });
    const value = query[0]?.value;
    return (value as string) || '0.0.0';
  }
}

export default new DatabaseManager();
