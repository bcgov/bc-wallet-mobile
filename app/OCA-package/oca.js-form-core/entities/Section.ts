import type { Translations } from '../types/Translations';
import type { SectionTranslation } from '../types/SectionTranslation';

export class Section {
  id: string;
  translations: Translations<SectionTranslation>;

  constructor(id: string, translations: Translations<SectionTranslation>) {
    this.id = id;
    this.translations = translations;
    return this;
  }
}