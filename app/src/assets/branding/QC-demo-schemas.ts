import { types } from 'aries-bifold'

type CardLayoutOverlay11 = types.oca.CardLayoutOverlay11
type MetaOverlay = types.oca.MetaOverlay
type FormatOverlay = types.oca.FormatOverlay
type LabelOverlay = types.oca.LabelOverlay
type CaptureBaseOverlay = types.oca.CaptureBaseOverlay
type CharacterEncodingOverlay = types.oca.CharacterEncodingOverlay

export enum DEMO_CREDENTIALS {
  DEMO_ANIG = 'Ep31SvFAetugFPe5CGzJxt:2:demo_anig:1.0',
  DEMO_ADDRESS = 'Ep31SvFAetugFPe5CGzJxt:2:demo_address:1.0',
  DEMO_PHOTO = 'Ep31SvFAetugFPe5CGzJxt:2:demo_photo:1.0',
}

// ANIG

export const DEMO_ANIG_Bundle = {
  captureBase: {
    captureBase: '',
    type: 'spec/capture_base/1.0',
    attributes: {
      birthdate_dateint: 'DateInt',
      insurance_level: 'Numeric',
      family_name: 'Text',
      given_names: 'Text',
      citizen_id: 'Text',
    },
  } as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'ANIG',
      issuerName: 'Ministère de la cybersécurité et du numérique',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'ANIG',
      issuerName: 'Ministry of Cybersecurity and Digital',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/character_encoding/1.0',
      captureBase: '',
      attributeCharacterEncoding: {
        birthdate_dateint: 'utf-8',
        insurance_level: 'utf-8',
        family_name: 'utf-8',
        given_names: 'utf-8',
        citizen_id: 'utf-8',
      },
    } as CharacterEncodingOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'fr',
      attributeLabels: {
        birthdate_dateint: 'Date de naissance',
        insurance_level: "Niveau d'assurance",
        family_name: 'Nom',
        given_names: 'Prénom',
        citizen_id: 'Identifiant unique gouvernemental',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'en',
      attributeLabels: {
        birthdate_dateint: 'Date of Birth',
        insurance_level: 'Insurance Level',
        family_name: 'Family Name',
        given_names: 'Given Names',
        citizen_id: 'Unique Government Identifier',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/card_layout/1.1',
      captureBase: '',
      logo: {
        src: require('./logo-quebec.png'),
      },
      primaryBackgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#095797',
      backgroundImage: {
        src: require('./background-qc.png'),
      },
    } as CardLayoutOverlay11,
  ],
}

// ADDRESS
export const DEMO_ADDRESS_Bundle = {
  captureBase: {
    captureBase: '',
    type: 'spec/capture_base/1.0',
    attributes: {
      street_address: 'Text',
      locality: 'Text',
      region: 'Text',
      postal_code: 'Text',
      country: 'Text',
    },
  } as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Adresse',
      issuerName: 'Ministère de la cybersécurité et du numérique',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Address',
      issuerName: 'Ministry of Cybersecurity and Digital',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/character_encoding/1.0',
      captureBase: '',
      attributeCharacterEncoding: {
        street_address: 'utf-8',
        locality: 'utf-8',
        region: 'utf-8',
        postal_code: 'utf-8',
        country: 'utf-8',
      },
    } as CharacterEncodingOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'fr',
      attributeLabels: {
        street_address: 'Adresse',
        locality: 'Ville',
        region: 'Province',
        postal_code: 'Code postal',
        country: 'Pays',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'en',
      attributeLabels: {
        street_address: 'Address',
        locality: 'Locality',
        region: 'Region',
        postal_code: 'Postal Code',
        country: 'Country',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/card_layout/1.1',
      captureBase: '',
      logo: {
        src: require('./logo-quebec.png'),
      },
      primaryBackgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#095797',
      backgroundImage: {
        src: require('./background-qc.png'),
      },
    } as CardLayoutOverlay11,
  ],
}

// PHOTO
export const DEMO_PHOTO_Bundle = {
  captureBase: {
    captureBase: '',
    type: 'spec/capture_base/1.0',
    attributes: {
      picture: 'Binary',
      citizen_id: 'Text',
    },
  } as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Photo',
      issuerName: 'Ministère de la cybersécurité et du numérique',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Photo',
      issuerName: 'Ministry of Cybersecurity and Digital',
      watermark: 'NON-PRODUCTION',
    } as MetaOverlay,
    {
      type: 'spec/overlays/character_encoding/1.0',
      captureBase: '',
      attributeCharacterEncoding: {
        picture: 'base64',
        citizen_id: 'utf-8',
      },
    } as CharacterEncodingOverlay,
    {
      type: 'spec/overlays/format/1.0',
      captureBase: '',
      attributeFormats: {
        picture: 'image/png',
      },
    } as FormatOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'fr',
      attributeLabels: {
        picture: 'Photo',
        citizen_id: 'Identifiant unique gouvernemental',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/label/1.0',
      captureBase: '',
      language: 'en',
      attributeLabels: {
        picture: 'Picture',
        citizen_id: 'Unique Government Identifier',
      },
    } as LabelOverlay,
    {
      type: 'spec/overlays/card_layout/1.1',
      captureBase: '',
      logo: {
        src: require('./logo-quebec.png'),
      },
      primaryBackgroundColor: '#FFFFFF',
      secondaryBackgroundColor: '#095797',
      backgroundImage: {
        src: require('./background-qc.png'),
      },
    } as CardLayoutOverlay11,
  ],
}
