export type OCA = {
    capture_base: CaptureBase,
    overlays: Overlay[],
    references?: {
        [capture_base_sai: string]: OCA
    }
}

export type CaptureBase = {
    type: string,
    classification: string,
    attributes: { [attr_name: string]: string },
    flagged_attributes: string[]
}

export type Overlay =
    | CardinalityOverlay
    | CharacterEncodingOverlay
    | ConditionalOverlay
    | ConformanceOverlay
    | EntryOverlay
    | EntryCodeOverlay
    | EntryCodeMappingOverlay
    | FormatOverlay
    | InformationOverlay
    | LabelOverlay
    | MappingOverlay
    | MetaOverlay
    | UnitOverlay
    | FormLayoutOverlay
    | CredentialLayoutOverlay


export type CardinalityOverlay = {
    capture_base: string,
    type: string,
    attr_cardinality: { [attr_name: string]: string }
}

export type CharacterEncodingOverlay = {
    capture_base: string,
    type: string,
    default_character_encoding: string,
    attr_character_encoding: { [attr_name: string]: string }
}

export type ConditionalOverlay = {
    capture_base: string,
    type: string,
    attr_conditions: { [attr_name: string]: string },
    attr_dependencies: { [attr_name: string]: string[] }
}

export type ConformanceOverlay = {
    capture_base: string,
    type: string,
    attr_conformance: { [attr_name: string]: 'O' | 'M' }
}

export type CredentialLayoutOverlay = {
    capture_base: string,
    type: string,
    layout: {
        version: string,
        config?: {
            css?: {
                width?: string,
                height?: string,
                style?: string
            }
        },
        pages: {
            config?: {
                css?: {
                    style?: string,
                    classes?: string[],
                    background_image?: string
                },
                name: string
            },
            elements: {
                type: string,
                size?: string,
                name?: string,
                layout?: string,
                content?: string,
                config?: {
                    css?: {
                        style?: string
                        classes?: string[]
                    }
                },
                elements?: CredentialLayoutOverlay['layout']['pages'][0]['elements']
            }[]
        }[],
        labels?: {
            [label: string]: {
                [language: string]: string
            }
        },
        reference_layouts?: {
            [reference_layout: string]: CredentialLayoutOverlay['layout']
        }
    }
}

export type EntryOverlay = {
    capture_base: string,
    type: string,
    language: string,
    attr_entries: { [attr_name: string]: { [entry_code: string]: string } }
}

export type EntryCodeOverlay = {
    capture_base: string,
    type: string,
    attr_entry_codes: { [attr_name: string]: string[] }
}

export type EntryCodeMappingOverlay = {
    capture_base: string,
    type: string,
    attr_mapping: { [attr_name: string]: string[] }
}

export type FormLayoutOverlay = {
    capture_base: string,
    type: string,
    layout: {
        config?: {
            css?: {
                style?: string
            }
        },
        elements: {
            type: string,
            config?: {
                css?: {
                    style?: string,
                    classes?: string[]
                }
            },
            id?: string,
            name?: string,
            parts?: {
                name: string,
                layout?: string,
                config?: {
                    css?: {
                        style?: string,
                        classes?: string[]
                    }
                }
            }[]
        }[],
        reference_layouts?: {
            [reference_layout: string]: FormLayoutOverlay['layout']
        }
    }
}

export type FormatOverlay = {
    capture_base: string,
    type: string,
    attr_formats: { [attr_name: string]: string }
}

export type InformationOverlay = {
    capture_base: string,
    type: string,
    language: string,
    attr_information: { [attr_name: string]: string }
}

export type LabelOverlay = {
    capture_base: string,
    type: string,
    language: string,
    attr_labels: { [attr_name: string]: string }
    attr_categories: string[],
    cat_labels: { [cat_id: string]: string },
    cat_attributes: { [cat_id: string]: string[] }
}

export type MappingOverlay = {
    capture_base: string,
    type: string,
    attr_mapping: { [attr_name: string]: string }
}

export type MetaOverlay = {
    capture_base: string,
    type: string,
    language: string,
    name: string,
    description: string
}

export type UnitOverlay = {
    capture_base: string,
    type: string,
    metric_system: string,
    attr_units: { [attr_name: string]: string }
}


