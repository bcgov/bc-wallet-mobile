import { Structure } from '../entities/Structure';
import { Section } from '../entities/Section';
import { ControlFactory } from '../ControlFactory';
import type { ControlData } from '../types/ControlData';
import type { Translations } from '../types/Translations';
import type { Attribute } from '../types/Attribute';
import type { AttributeTranslation } from '../types/AttributeTranslation';
import type { SectionTranslation } from '../types/SectionTranslation';
import type { StructureTranslation } from '../types/StructureTranslation';
import type { Config as OcaJsConfig } from '../OcaJs';

import type {
  OCA,
  CardinalityOverlay,
  CharacterEncodingOverlay,
  ConditionalOverlay,
  ConformanceOverlay,
  MappingOverlay,
  EntryCodeMappingOverlay,
  MetaOverlay,
  FormatOverlay,
  UnitOverlay,
  EntryCodeOverlay,
  LabelOverlay,
  EntryOverlay,
  InformationOverlay,
  FormLayoutOverlay,
  CredentialLayoutOverlay,
  Overlay,
} from '../../oca/oca';

export const createStructure = async (
  oca: OCA,
  config: OcaJsConfig
): Promise<Structure> => {
  const captureBaseSAI = oca.overlays[0].capture_base;
  const sortedOverlays = sortOverlaysByCaptureBase(oca.overlays);
  const groupedOverlays = groupOverlays(sortedOverlays[captureBaseSAI]);

  const structureFromMeta = getStructureFromMeta(groupedOverlays.meta);
  const structure = new Structure(
    captureBaseSAI,
    structureFromMeta.translations
  );

  const sectionsFromLabel = getSectionsFromLabel(groupedOverlays.label);
  const attributes = collectAttributesFromOverlays(
    Object.keys(oca.capture_base.attributes),
    groupedOverlays
  );

  if (groupedOverlays.formLayout.length > 0) {
    structure.addFormLayout(groupedOverlays.formLayout[0].layout);
  }

  if (groupedOverlays.credentialLayout.length > 0) {
    structure.addCredentialLayout(groupedOverlays.credentialLayout[0].layout);
  }

  for (const [id, section] of Object.entries(sectionsFromLabel)) {
    structure.addSection(new Section(id, section.translations));
  }

  for (const [attrName, attrType] of Object.entries(
    oca.capture_base.attributes
  )) {
    let sai;
    if (attrType.startsWith('SAI:')) {
      sai = attrType.replace('SAI:', '');
    }
    if (attrType.startsWith('Array[SAI:')) {
      sai = attrType.replace('Array[SAI:', '').replace(']', '');
    }
    const attribute = attributes[attrName];
    const data: ControlData = {
      name: attrName,
      isFlagged: oca.capture_base.flagged_attributes.includes(attrName),
      sai,
      multiple: attrType.startsWith('Array'),
      ...attribute,
    };
    if (sai && oca.references && oca.references[sai]) {
      data.reference = await createStructure(oca.references[sai], config);
    }
    const control = await ControlFactory.getControl(attrType, data, config);

    if (control!.type == 'Reference') {
      const customOverlays = groupOverlays(
        sortedOverlays[control!.reference!.captureBaseSAI] || []
      );
      if (customOverlays.credentialLayout.length > 0) {
        control!.reference!.addCredentialLayout(
          customOverlays.credentialLayout[0].layout
        );
      }
      if (customOverlays.formLayout.length > 0) {
        control!.reference!.addFormLayout(customOverlays.formLayout[0].layout);
      }
    }
    if (control) structure.addControl(control);
  }

  return structure;
};

const sortOverlaysByCaptureBase = (overlays: Overlay[]) => {
  return overlays.reduce((result: Record<string, Overlay[]>, overlay) => {
    const captureBaseSAI = overlay.capture_base;
    if (!result[captureBaseSAI]) {
      result[captureBaseSAI] = [];
    }
    result[captureBaseSAI].push(overlay);
    return result;
  }, {});
};

type GroupedOverlays = {
  cardinality: CardinalityOverlay[];
  characterEncoding: CharacterEncodingOverlay[];
  conditional: ConditionalOverlay[];
  conformance: ConformanceOverlay[];
  entry: EntryOverlay[];
  entryCode: EntryCodeOverlay[];
  entryCodeMapping: EntryCodeMappingOverlay[];
  format: FormatOverlay[];
  information: InformationOverlay[];
  label: LabelOverlay[];
  mapping: MappingOverlay[];
  meta: MetaOverlay[];
  unit: UnitOverlay[];
  formLayout: FormLayoutOverlay[];
  credentialLayout: CredentialLayoutOverlay[];
};

const groupOverlays = (overlays: Overlay[]): GroupedOverlays => {
  return {
    cardinality: overlays.filter((o) =>
      o.type.includes(`/cardinality/`)
    ) as CardinalityOverlay[],
    characterEncoding: overlays.filter((o) =>
      o.type.includes(`/character_encoding/`)
    ) as CharacterEncodingOverlay[],
    conditional: overlays.filter((o) =>
      o.type.includes(`/conditional/`)
    ) as ConditionalOverlay[],
    conformance: overlays.filter((o) =>
      o.type.includes(`/conformance/`)
    ) as ConformanceOverlay[],
    entry: overlays.filter((o) => o.type.includes(`/entry/`)) as EntryOverlay[],
    entryCode: overlays.filter((o) =>
      o.type.includes(`/entry_code/`)
    ) as EntryCodeOverlay[],
    entryCodeMapping: overlays.filter((o) =>
      o.type.includes(`/entry_code_mapping/`)
    ) as EntryCodeMappingOverlay[],
    format: overlays.filter((o) =>
      o.type.includes(`/format/`)
    ) as FormatOverlay[],
    information: overlays.filter((o) =>
      o.type.includes(`/information/`)
    ) as InformationOverlay[],
    label: overlays.filter((o) => o.type.includes(`/label/`)) as LabelOverlay[],
    mapping: overlays.filter((o) =>
      o.type.includes(`/mapping/`)
    ) as MappingOverlay[],
    meta: overlays.filter((o) => o.type.includes(`/meta/`)) as MetaOverlay[],
    unit: overlays.filter((o) => o.type.includes(`/unit/`)) as UnitOverlay[],
    formLayout: overlays.filter((o) =>
      o.type.includes(`/form_layout/`)
    ) as FormLayoutOverlay[],
    credentialLayout: overlays.filter((o) =>
      o.type.includes(`/credential_layout/`)
    ) as CredentialLayoutOverlay[],
  };
};

const getStructureFromMeta = (metaOverlays: MetaOverlay[]) => {
  const result: {
    translations: Translations<StructureTranslation>;
  } = { translations: {} };

  metaOverlays.forEach((o) => {
    result.translations[o.language] = {
      name: o.name,
      description: o.description,
    };
  });

  return result;
};

type SectionsFromLabel = {
  [id: string]: SectionFromLabel;
};
type SectionFromLabel = {
  translations: Translations<SectionTranslation>;
};
const getSectionsFromLabel = (labelOverlays: LabelOverlay[]) => {
  const result: SectionsFromLabel = {};

  labelOverlays.forEach((o) => {
    o.attr_categories.forEach(
      (cat: string) => (result[cat] ||= { translations: {} })
    );

    Object.entries(o.cat_labels).forEach(
      ([cat, label]: [string, string]) =>
        (result[cat].translations[o.language] = { label })
    );
  });

  return result;
};

const collectAttributesFromOverlays = (
  attributeNames: string[],
  groupedOverlays: GroupedOverlays
) => {
  const result: { [attr_name: string]: Attribute } = {};

  attributeNames.forEach((attrName) => {
    result[attrName] = { translations: {} };
  });

  if (groupedOverlays.cardinality.length > 0) {
    const fromCardinality = getAttributesFromCardinality(
      groupedOverlays.cardinality[0]
    );
    Object.entries(fromCardinality).forEach(([attrName, cardinality]) => {
      result[attrName].cardinality = cardinality;
    });
  }

  if (groupedOverlays.characterEncoding.length > 0) {
    const fromCharacterEncoding = getAttributesFromCharacterEncoding(
      groupedOverlays.characterEncoding[0]
    );
    Object.keys(result).forEach((attrName) => {
      result[attrName].characterEncoding =
        fromCharacterEncoding.attributes[attrName] ||
        fromCharacterEncoding.default;
    });
  }

  if (groupedOverlays.conditional.length > 0) {
    const fromConditional = getAttributesFromConditional(
      groupedOverlays.conditional[0]
    );
    Object.entries(fromConditional).forEach(([attrName, v]) => {
      result[attrName].condition = v.condition;
      result[attrName].dependencies = v.dependencies;
    });
  }

  if (groupedOverlays.conformance.length > 0) {
    const fromConformance = getAttributesFromConformance(
      groupedOverlays.conformance[0]
    );
    Object.entries(fromConformance).forEach(([attrName, conformance]) => {
      result[attrName].conformance = conformance;
    });
  }

  if (groupedOverlays.mapping.length > 0) {
    const fromMapping = getAttributesFromMapping(groupedOverlays.mapping[0]);
    Object.entries(fromMapping).forEach(([attrName, mapping]) => {
      result[attrName].mapping = mapping;
    });
  }

  if (groupedOverlays.format.length > 0) {
    const fromFormat = getAttributesFromFormat(groupedOverlays.format[0]);
    Object.entries(fromFormat).forEach(([attrName, format]) => {
      result[attrName].format = format;
    });
  }

  if (groupedOverlays.unit.length > 0) {
    groupedOverlays.unit.forEach((overlay) => {
      Object.entries(getAttributesFromUnit(overlay)).forEach(
        ([attrName, attrUnit]) => {
          result[attrName].metric_system = attrUnit.metric_system;
          result[attrName].unit = attrUnit.unit;
        }
      );
    });
  }

  if (groupedOverlays.entryCode.length > 0) {
    const fromEntryCode = getAttributesFromEntryCode(
      groupedOverlays.entryCode[0]
    );
    Object.entries(fromEntryCode).forEach(([attrName, entryCodes]) => {
      result[attrName].entryCodes = entryCodes;
    });
  }

  if (groupedOverlays.entryCodeMapping.length > 0) {
    const fromMapping = getAttributesFromEntryCodeMapping(
      groupedOverlays.entryCodeMapping[0]
    );
    Object.entries(fromMapping).forEach(([attrName, mapping]) => {
      result[attrName].entryCodesMapping = mapping;
    });
  }

  const fromLabel = getAttributesFromLabel(groupedOverlays.label);
  Object.entries(fromLabel).forEach(([attrName, { translations }]) => {
    result[attrName] ??= { translations: {} };
    Object.entries(translations).forEach(([lang, translation]) => {
      result[attrName].translations[lang] ??= {};
      result[attrName].translations[lang].label = translation.label;
    });
  });

  const fromInformation = getAttributesFromInformation(
    groupedOverlays.information
  );
  Object.entries(fromInformation).forEach(([attrName, { translations }]) => {
    result[attrName] ??= { translations: {} };
    Object.entries(translations).forEach(([lang, translation]) => {
      result[attrName].translations[lang] ??= {};
      result[attrName].translations[lang].information = translation.information;
    });
  });

  const fromEntry = getAttributesFromEntry(groupedOverlays.entry);
  Object.entries(fromEntry).forEach(([attrName, { translations }]) => {
    result[attrName] ??= { translations: {} };
    Object.entries(translations).forEach(([lang, translation]) => {
      result[attrName].translations[lang] ??= {};
      result[attrName].translations[lang].entries = translation.entries;
    });
  });

  return result;
};

const getAttributesFromLabel = (labelOverlays: LabelOverlay[]) => {
  const result: {
    [attrName: string]: {
      translations: Translations<AttributeTranslation>;
    };
  } = {};

  labelOverlays.forEach((o) => {
    Object.entries(o.attr_labels).forEach(([attrName, label]) => {
      result[attrName] ??= { translations: {} };
      result[attrName].translations[o.language] ||= { label };
    });
  });
  return result;
};

const getAttributesFromInformation = (
  informationOverlays: InformationOverlay[]
) => {
  const result: {
    [attrName: string]: {
      translations: Translations<AttributeTranslation>;
    };
  } = {};

  informationOverlays.forEach((o) => {
    Object.entries(o.attr_information).forEach(([attrName, information]) => {
      result[attrName] ??= { translations: {} };
      result[attrName].translations[o.language] ||= { information };
    });
  });
  return result;
};

const getAttributesFromEntry = (entryOverlays: EntryOverlay[]) => {
  const result: {
    [attrName: string]: {
      translations: Translations<AttributeTranslation>;
    };
  } = {};

  entryOverlays.forEach((o) => {
    Object.entries(o.attr_entries).forEach(([attrName, entries]) => {
      result[attrName] ??= { translations: {} };
      result[attrName].translations[o.language] ||= { entries };
    });
  });
  return result;
};

const getAttributesFromCardinality = (
  cardinalityOverlay: CardinalityOverlay
) => {
  const result: { [attrName: string]: string } = {};

  Object.entries(cardinalityOverlay.attr_cardinality).forEach(
    ([attrName, cardinalityOverlay]) => {
      result[attrName] = cardinalityOverlay;
    }
  );
  return result;
};

const getAttributesFromCharacterEncoding = (
  encodingOverlay: CharacterEncodingOverlay
) => {
  const result: {
    default: string;
    attributes: { [attrName: string]: string };
  } = {
    default: encodingOverlay.default_character_encoding,
    attributes: {},
  };

  Object.entries(encodingOverlay.attr_character_encoding).forEach(
    ([attrName, encoding]) => {
      result.attributes[attrName] = encoding;
    }
  );
  return result;
};

const getAttributesFromConditional = (
  conditionalOverlay: ConditionalOverlay
) => {
  const result: {
    [attrName: string]: { condition?: string; dependencies?: string[] };
  } = {};

  Object.entries(conditionalOverlay.attr_conditions).forEach(
    ([attrName, condition]) => {
      result[attrName] ||= {};
      result[attrName].condition = condition;
    }
  );
  Object.entries(conditionalOverlay.attr_dependencies).forEach(
    ([attrName, dependencies]) => {
      result[attrName] ||= {};
      result[attrName].dependencies = dependencies;
    }
  );
  return result;
};

const getAttributesFromConformance = (
  conformanceOverlay: ConformanceOverlay
) => {
  const result: { [attrName: string]: 'O' | 'M' } = {};

  Object.entries(conformanceOverlay.attr_conformance).forEach(
    ([attrName, conformance]) => {
      result[attrName] = conformance;
    }
  );
  return result;
};

const getAttributesFromMapping = (mappingOverlay: MappingOverlay) => {
  const result: { [attrName: string]: string } = {};

  Object.entries(mappingOverlay.attr_mapping).forEach(([attrName, mapping]) => {
    result[attrName] = mapping;
  });
  return result;
};

const getAttributesFromFormat = (formatOverlay: FormatOverlay) => {
  const result: { [attrName: string]: string } = {};

  Object.entries(formatOverlay.attr_formats).forEach(([attrName, format]) => {
    result[attrName] = format;
  });
  return result;
};

const getAttributesFromUnit = (unitOverlay: UnitOverlay) => {
  const result: {
    [attrName: string]: { metric_system: string; unit: string };
  } = {};
  const metric_system = unitOverlay.metric_system;

  Object.entries(unitOverlay.attr_units).forEach(([attrName, unit]) => {
    result[attrName] = { metric_system, unit };
  });
  return result;
};

const getAttributesFromEntryCode = (entryCodeOverlay: EntryCodeOverlay) => {
  const result: { [attrName: string]: string[] } = {};

  Object.entries(entryCodeOverlay.attr_entry_codes).forEach(
    ([attrName, entryCodes]) => {
      result[attrName] = entryCodes;
    }
  );
  return result;
};

const getAttributesFromEntryCodeMapping = (
  mappingOverlay: EntryCodeMappingOverlay
) => {
  const result: { [attrName: string]: string[] } = {};

  Object.entries(mappingOverlay.attr_mapping).forEach(([attrName, mapping]) => {
    result[attrName] = mapping;
  });
  return result;
};
