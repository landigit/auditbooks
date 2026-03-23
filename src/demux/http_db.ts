import { DatabaseError } from '../../fyo/utils/errors';
import type { SchemaMap } from '../../schemas/types';
import { DatabaseDemuxBase, type DatabaseMethod } from '../../utils/db/types';
import type { BackendResponse } from '../../utils/ipc/types';

export class HttpDatabaseDemux extends DatabaseDemuxBase {
  #backendUrl = 'http://localhost:8080';

  constructor(isElectron: boolean) {
    super();
  }

  async #handleDBCall(func: () => Promise<Response>): Promise<unknown> {
    const res = await func();
    const response: BackendResponse = await res.json();

    if (response.error?.name) {
      const { name, message, stack } = response.error;
      const dberror = new DatabaseError(`${name}\n${message}`);
      dberror.stack = stack;
      throw dberror;
    }

    return response.data;
  }

  async getSchemaMap(): Promise<SchemaMap> {
    return (await this.#handleDBCall(async () => {
      return await fetch(`${this.#backendUrl}/data/db/getSchema`);
    })) as SchemaMap;
  }

  async createNewDatabase(
    dbPaths: string,
    countryCode?: string
  ): Promise<string> {
    return (await this.#handleDBCall(async () => {
      return await fetch(`${this.#backendUrl}/data/db/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPaths, countryCode }),
      });
    })) as string;
  }

  async connectToDatabase(
    dbPaths: string,
    countryCode?: string
  ): Promise<string> {
    return (await this.#handleDBCall(async () => {
      return await fetch(`${this.#backendUrl}/data/db/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPaths, countryCode }),
      });
    })) as string;
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    return await this.#handleDBCall(async () => {
      return await fetch(`${this.#backendUrl}/data/db/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      });
    });
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    return await this.#handleDBCall(async () => {
      return await fetch(`${this.#backendUrl}/data/db/bespoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, args }),
      });
    });
  }
}
