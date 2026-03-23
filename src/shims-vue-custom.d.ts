import type { Fyo } from 'fyo';
import type { TranslationLiteral } from 'fyo/utils/translation';

declare module 'vue' {
  interface ComponentCustomProperties {
    t: (...args: TranslationLiteral[]) => string;
    fyo: Fyo;
    platform: 'Windows' | 'Linux' | 'Mac';
  }
}
