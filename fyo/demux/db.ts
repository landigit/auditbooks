import { invoke } from '@tauri-apps/api/core';
import { DatabaseError } from 'fyo/utils/errors';
import { SchemaMap } from 'schemas/types';
import { getSchemas } from 'schemas';
import { DatabaseDemuxBase, DatabaseMethod } from 'utils/db/types';

export class DatabaseDemux extends DatabaseDemuxBase {
  countryCode = 'in';
  rawCustomFields: any[] = [];

  constructor() {
    super();
  }

  async #handleTauriDBCall<T>(func: () => Promise<T>): Promise<T> {
    try {
      return await func();
    } catch (err: any) {
      throw new DatabaseError(String(err));
    }
  }

  async getSchemaMap(): Promise<SchemaMap> {
    return getSchemas(this.countryCode, this.rawCustomFields);
  }

  async createNewDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    const res = await this.#handleTauriDBCall(async () => {
      return (await invoke('db_create', { dbPath, countryCode })) as {
        countryCode: string;
        rawCustomFields: any[];
      };
    });
    this.countryCode = res.countryCode;
    this.rawCustomFields = res.rawCustomFields;

    // Update schema map on the Rust backend
    const schemaMap = getSchemas(this.countryCode, this.rawCustomFields);
    await this.#handleTauriDBCall(async () => {
      await invoke('db_set_schema_map', { schemaMap });
      await invoke('db_migrate');
    });

    return this.countryCode;
  }

  async connectToDatabase(
    dbPath: string,
    countryCode?: string
  ): Promise<string> {
    const res = await this.#handleTauriDBCall(async () => {
      return (await invoke('db_connect', { dbPath, countryCode })) as {
        countryCode: string;
        rawCustomFields: any[];
      };
    });
    this.countryCode = res.countryCode;
    this.rawCustomFields = res.rawCustomFields;

    // Update schema map on the Rust backend
    const schemaMap = getSchemas(this.countryCode, this.rawCustomFields);
    await this.#handleTauriDBCall(async () => {
      await invoke('db_set_schema_map', { schemaMap });
      await invoke('db_migrate');
    });

    return this.countryCode;
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    // Map standard DB methods to their respective Tauri commands
    return await this.#handleTauriDBCall(async () => {
      if (method === 'insert') {
        return await invoke('db_insert', {
          schemaName: args[0],
          fieldValueMap: args[1],
        });
      } else if (method === 'get') {
        return await invoke('db_get', {
          schemaName: args[0],
          name: args[1],
          fields: args[2],
        });
      } else if (method === 'getAll') {
        return await invoke('db_get_all', {
          schemaName: args[0],
          options: args[1],
        });
      } else if (method === 'update') {
        return await invoke('db_update', {
          schemaName: args[0],
          fieldValueMap: args[1],
        });
      } else if (method === 'delete') {
        return await invoke('db_delete', {
          schemaName: args[0],
          name: args[1],
        });
      } else if (method === 'deleteAll') {
        return await invoke('db_delete_all', {
          schemaName: args[0],
          filters: args[1],
        });
      } else if (method === 'exists') {
        return await invoke('db_exists', {
          schemaName: args[0],
          name: args[1],
        });
      } else if (method === 'getSingleValues') {
        return await invoke('db_get_single_values', { fieldnames: args });
      } else if (method === 'rename') {
        return await invoke('db_rename', {
          schemaName: args[0],
          oldName: args[1],
          newName: args[2],
        });
      } else if (method === 'close') {
        return await invoke('db_close');
      } else {
        throw new DatabaseError(`Unsupported method: ${method}`);
      }
    });
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    return await this.#handleTauriDBCall(async () => {
      return await invoke('db_call_bespoke', { method, args });
    });
  }
}
