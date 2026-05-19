import { DatabaseDemuxBase, DatabaseMethod } from 'utils/db/types';
import { getSchemas } from 'schemas';
import DatabaseCore from 'backend/database/core';
import { BespokeQueries } from 'backend/database/bespoke';
import { DatabaseError } from 'fyo/utils/errors';

export class DatabaseManager extends DatabaseDemuxBase {
  db?: DatabaseCore;
  rawCustomFields: any[] = [];

  get #isInitialized(): boolean {
    return this.db !== undefined && this.db.client !== undefined;
  }

  getSchemaMap() {
    return getSchemas('-', this.rawCustomFields);
  }

  async createNewDatabase(dbPath: string, countryCode: string) {
    if (this.db) {
      await this.call('close');
    }
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
    try {
      countryCode ??= await DatabaseCore.getCountryCode(dbPath);
    } catch {
      countryCode ??= 'in';
    }
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
      )) || [];
    } catch {}
  }

  async #migrate(): Promise<void> {
    if (!this.#isInitialized) {
      return;
    }
    await this.db!.migrate();
  }

  async call(method: DatabaseMethod, ...args: unknown[]) {
    if (!this.#isInitialized) {
      return;
    }
    // @ts-ignore
    const response = await this.db[method](...args);
    if (method === 'close') {
      delete this.db;
    }
    return response;
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.#isInitialized) {
      return;
    }
    // @ts-ignore
    const queryFunction = BespokeQueries[method];
    if (!queryFunction) {
      throw new DatabaseError(`invalid bespoke db function ${method}`);
    }
    return await queryFunction(this.db!, ...args);
  }
}

export default new DatabaseManager();
