import { Fyo } from 'fyo';
import { Converter } from 'fyo/core/converter';
import { DocValue } from 'fyo/core/types';
import { Action } from 'fyo/model/types';
import Observable from 'fyo/utils/observable';
import { Field, RawValue } from 'schemas/types';
import { getIsNullOrUndef } from 'src/utils/core';
import { ColumnField, ReportData } from './types';

export abstract class Report extends Observable<RawValue> {
  static title: string;
  static reportName: string;
  static isInventory = false;

  fyo: Fyo;
  columns: ColumnField[] = [];
  filters: Field[] = [];
  reportData: ReportData;
  usePagination = false;
  shouldRefresh = false;
  abstract loading: boolean;

  constructor(fyo: Fyo) {
    super();
    this.fyo = fyo;
    this.reportData = [];
  }

  get title(): string {
    return (this.constructor as typeof Report).title;
  }

  get reportName(): string {
    return (this.constructor as typeof Report).reportName;
  }

  async initialize() {
    /**
     * Not in constructor cause possibly async.
     */

    await this.setDefaultFilters();
    this.filters = await this.getFilters();
    this.columns = await this.getColumns();
    await this.setReportData();
  }

  get filterMap() {
    const filterMap: Record<string, RawValue> = Object.create(null);
    for (const { fieldname } of this.filters) {
      if (
        fieldname === '__proto__' ||
        fieldname === 'constructor' ||
        fieldname === 'prototype'
      ) {
        continue;
      }
      const value = this.get(fieldname);
      if (getIsNullOrUndef(value)) {
        continue;
      }

      Reflect.set(filterMap, fieldname, value);
    }

    return filterMap;
  }

  async set(key: string, value: DocValue, callPostSet = true) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    const field = this.filters.find((f) => f.fieldname === key);
    if (field === undefined) {
      return;
    }

    value = Converter.toRawValue(value, field, this.fyo);
    const prevValue = Reflect.get(this, key);
    if (prevValue === value) {
      return;
    }

    if (getIsNullOrUndef(value)) {
      Reflect.deleteProperty(this, key);
    } else {
      Reflect.set(this, key, value);
    }

    if (callPostSet) {
      await this.updateData(key);
    }
  }

  async updateData(key?: string, force?: boolean) {
    await this.setDefaultFilters();
    this.filters = await this.getFilters();
    this.columns = await this.getColumns();
    await this.setReportData(key, force);
  }

  /**
   * Should first check if filter value is set
   * and update only if it is not set.
   */
  abstract setDefaultFilters(): void | Promise<void>;
  abstract getActions(): Action[];
  abstract getFilters(): Field[] | Promise<Field[]>;
  abstract getColumns(): ColumnField[] | Promise<ColumnField[]>;
  abstract setReportData(filter?: string, force?: boolean): Promise<void>;
}
