import type { ControlData } from '../../types/ControlData';
import type { AttributeTranslation } from '../../types/AttributeTranslation';
import type { Translations } from '../../types/Translations';
import type { ControlType } from '../../types/ControlType';
import type { Structure } from '../Structure';

export class ControlBase {
  name: string;
  isFlagged: boolean;
  multiple: boolean;
  characterEncoding: string | undefined;
  entryCodes: string[] | undefined;
  entryCodesMapping: string[] | undefined;
  format: string | undefined;
  metric_system: string | undefined;
  unit: string | undefined;
  sai: string | undefined;
  condition: string | undefined;
  dependencies: string[] | undefined;
  mapping: string | undefined;
  cardinality: string | undefined;
  conformance: 'O' | 'M' | undefined;
  reference: Structure | null | undefined;
  translations: Translations<AttributeTranslation>;
  type: ControlType;

  constructor(data: ControlData & { type: ControlType }) {
    this.name = data.name;
    this.isFlagged = data.isFlagged;
    this.multiple = data.multiple;
    this.characterEncoding = data.characterEncoding;
    this.entryCodes = data.entryCodes;
    this.entryCodesMapping = data.entryCodesMapping;
    this.format = data.format;
    this.metric_system = data.metric_system;
    this.unit = data.unit;
    this.sai = data.sai;
    this.condition = data.condition;
    this.dependencies = data.dependencies;
    this.mapping = data.mapping;
    this.cardinality = data.cardinality;
    this.conformance = data.conformance;
    this.reference = data.reference;
    this.translations = data.translations;
    this.type = data.type;
  }
}
