import type { AttributeTranslation } from './AttributeTranslation';
import type { Translations } from './Translations';

export type Attribute = {
  characterEncoding?: string;
  entryCodes?: string[];
  entryCodesMapping?: string[];
  format?: string;
  metric_system?: string;
  unit?: string;
  sai?: string;
  condition?: string;
  dependencies?: string[];
  mapping?: string;
  cardinality?: string;
  conformance?: 'O' | 'M';
  translations: Translations<AttributeTranslation>;
};