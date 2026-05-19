import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import countryInfo from '../fixtures/countryInfo.json';
import { CUSTOM_EVENTS } from './messages';
import { CountryInfoMap, UnexpectedLogObject } from './types';

export function getCountryInfo(): CountryInfoMap {
  // @ts-ignore
  return countryInfo as CountryInfoMap;
}

export function getCountryCodeFromCountry(countryName: string): string {
  const countryInfoMap = getCountryInfo();
  const countryInfo = countryInfoMap[countryName];
  if (countryInfo === undefined) {
    return '';
  }

  return countryInfo.code;
}

export function getFiscalYear(
  date: string,
  isStart: boolean
): undefined | Date {
  if (!date) {
    return undefined;
  }

  const today = dayjs();
  const dateTime = dayjs(date, 'MM-DD');
  if (isStart) {
    return dateTime
      .add([0, 1, 2].includes(today.month()) ? -1 : 0, 'year')
      .toDate();
  }

  return dateTime
    .add([0, 1, 2].includes(today.month()) ? 0 : 1, 'year')
    .toDate();
}

export function logUnexpected(detail: Partial<UnexpectedLogObject>) {
  /**
   * Raises a custom event, it's lsitener is in renderer.ts
   * used to log unexpected occurances as errors.
   */
  if (!window?.CustomEvent) {
    return;
  }

  detail.name ??= 'LogUnexpected';
  detail.message ??= 'Logging an unexpected occurance';
  detail.stack ??= new Error().stack;
  detail.more ??= {};

  const event = new window.CustomEvent(CUSTOM_EVENTS.LOG_UNEXPECTED, {
    detail,
  });
  window.dispatchEvent(event);
}
