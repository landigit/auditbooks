import { DatabaseError, NotImplemented } from 'fyo/utils/errors';
import { SchemaMap } from 'schemas/types';
import { DatabaseDemuxBase, DatabaseMethod } from 'src/utils/db/types';
import { BackendResponse } from 'src/utils/ipc/types';

export class DatabaseDemux extends DatabaseDemuxBase {
  #isDesktop = false;
  constructor(isDesktop: boolean) {
    super();
    this.#isDesktop = isDesktop;
  }

  async #handleDBCall(func: () => Promise<BackendResponse>): Promise<unknown> {
    const response = await func();

    if (response.error?.name) {
      const { name, message, stack } = response.error;
      const dberror = new DatabaseError(`${name}\n${message}`);
      dberror.stack = stack;

      throw dberror;
    }

    return response.data;
  }

  async getSchemaMap(): Promise<SchemaMap> {
    if (!this.#isDesktop) {
      throw new NotImplemented();
    }

    return (await this.#handleDBCall(async () => {
      return await appIpc.db.getSchema();
    })) as SchemaMap;
  }

  async createNewDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    if (!this.#isDesktop) {
      throw new NotImplemented();
    }

    return (await this.#handleDBCall(async () => {
      return appIpc.db.create(dbPath, countryCode);
    })) as string;
  }

  async connectToDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    if (!this.#isDesktop) {
      throw new NotImplemented();
    }

    return (await this.#handleDBCall(async () => {
      return appIpc.db.connect(dbPath, countryCode);
    })) as string;
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    if (!this.#isDesktop) {
      throw new NotImplemented();
    }

    return await this.#handleDBCall(async () => {
      return await appIpc.db.call(method, ...args);
    });
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.#isDesktop) {
      throw new NotImplemented();
    }

    return await this.#handleDBCall(async () => {
      return await appIpc.db.bespoke(method, ...args);
    });
  }
}
