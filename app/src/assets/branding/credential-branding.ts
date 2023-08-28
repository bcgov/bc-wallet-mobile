import {
  IBrandingOverlayData,
  IOverlayBundleData,
  IMetaOverlayData,
  ICaptureBaseData,
  IFormatOverlayData,
  ICharacterEncodingOverlayData,
  ILabelOverlayData,
} from '@hyperledger/aries-oca'

export enum CREDENTIALS {
  LSBC_TEST = 'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default',
  LSBC_PROD = '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default',
  SHOWCASE_LAWYER_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.53',
  SHOWCASE_LAWYER_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:member_card:1.53',
  SHOWCASE_LAWYER_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:member_card:1.53',
  SHOWCASE_STUDENT_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:student_card:1.2',
  SHOWCASE_STUDENT_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:student_card:1.2',
  SHOWCASE_STUDENT_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:student_card:1.2',
  SHOWCASE_LAWYER2_PERSON_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:Person:1.2',
  SHOWCASE_LAWYER2_PERSON_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:Person:1.2',
  SHOWCASE_LAWYER2_PERSON_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:Person:1.2',
  UNVERIFIED_PERSON_DEV = 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_TEST = 'HTkhhCW1bAXWnxC1u3YVoa:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_PROD = 'YXCtXE4YhVjULgj5hrk4ML:2:unverified_person:0.1.0',
  PILOT_INVITE_DEV = 'Mp2pDQqS2eSjNVA7kXc8ut:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_TEST = '4zBepKVWZcGTzug4X49vAN:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_PROD = 'E2h4RUJxyh48PLJ1CtGJrq:2:BC VC Pilot Certificate:1.0.1',
  BC_DIGITAL_ID_QA = 'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
  BC_DIGITAL_ID_SIT = '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
  BC_DIGITAL_ID_DEV = 'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
  BC_DIGITAL_ID_PROD = 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
}

// Pilot overlay data
const digitalIdInvitationCardCaptureBaseData: ICaptureBaseData = {
  classification: '',
  attributes: {
    iss_dateint: 'Text',
    emailAddress: 'Text',
    name: 'Text',
    program: 'Text',
  },
  flagged_attributes: [],
  type: 'spec/capture_base/1.0',
}
const digitalIdInvitationCardBrandingOverlayData: IBrandingOverlayData = {
  capture_base: '',
  type: 'aries/overlays/branding/1.0',
  logo: require('./invitation-logo.png'),
  primary_background_color: '#003366',
  background_image_slice: require('./invitation-background-image-slice.png'),
  background_image: require('./invitation-primary-background.png'),
}
const digitalIdInvitationCardMetaOverlayData: IMetaOverlayData = {
  capture_base: '',
  type: 'spec/overlays/meta/1.0',
  language: 'en',
  name: 'Pilot Invitation',
  issuer: 'Digital Identity and Trust Program',
  description: '',
  credential_help_text: '',
  credential_support_url: '',
  issuer_description: '',
  issuer_url: '',
}

// Student card overlay data
const studentCardCaptureBaseData: ICaptureBaseData = {
  classification: '',
  attributes: {
    student_first_name: 'Text',
    student_last_name: 'Text',
    expiry_date: 'DateInt',
  },
  flagged_attributes: [],
  type: 'spec/capture_base/1.0',
}
const studentCardBrandingOverlayData: IBrandingOverlayData = {
  capture_base: '',
  type: 'aries/overlays/branding/1.0',
  logo: require('./best-bc-logo.png'),
  primary_background_color: '#32674e',
  background_image: require('./best-bc-background-image.jpg'),
  background_image_slice: require('./best-bc-background-image-slice.jpg'),
}
const studentCardMetaOverlayDataEn: IMetaOverlayData = {
  capture_base: '',
  type: 'spec/overlays/meta/1.0',
  language: 'en',
  name: 'Student',
  issuer: 'BestBC College DEMO',
  description: '',
  credential_help_text: '',
  credential_support_url: '',
  issuer_description: '',
  issuer_url: '',
}
const studentCardMetaOverlayDataFr: IMetaOverlayData = {
  capture_base: '',
  type: 'spec/overlays/meta/1.0',
  language: 'fr',
  name: 'Student',
  issuer: 'BestBC College DEMO',
  description: '',
  credential_help_text: '',
  credential_support_url: '',
  issuer_description: '',
  issuer_url: '',
}

// LSBC overlay data
const memberCardCaptureBaseData: ICaptureBaseData = {
  classification: '',
  attributes: {
    'Member Status': 'Text',
    'Given Name': 'Text',
    PPID: 'Text',
    'Member Status Code': 'Text',
    Surname: 'Text',
  },
  flagged_attributes: [],
  type: 'spec/capture_base/1.0',
}
const memberCardBrandingOverlayData: IBrandingOverlayData = {
  capture_base: '',
  type: 'aries/overlays/branding/1.0',
  logo: require('./lsbc-logo.jpg'),
  primary_background_color: '#23485A',
  secondary_background_color: '#00698C',
  background_image: require('./lsbc-background-image.jpg'),
}

const digitalIdInvitationCardBundle: IOverlayBundleData = {
  capture_base: digitalIdInvitationCardCaptureBaseData,
  overlays: [digitalIdInvitationCardMetaOverlayData, digitalIdInvitationCardBrandingOverlayData],
}

const studentCardBundle: IOverlayBundleData = {
  capture_base: studentCardCaptureBaseData,
  overlays: [studentCardMetaOverlayDataEn, studentCardMetaOverlayDataFr, studentCardBrandingOverlayData],
}

const createMemberCardBundle = (demo = false): IOverlayBundleData => {
  return {
    capture_base: memberCardCaptureBaseData,
    overlays: [
      {
        capture_base: '',
        type: 'spec/overlays/meta/1.0',
        language: 'en',
        name: 'Member Card',
        issuer: demo ? 'Law Society of BC DEMO' : 'Law Society of BC',
        watermark: demo ? 'NON-PRODUCTION' : undefined,
        description: '',
        credential_help_text: '',
        credential_support_url: '',
        issuer_description: '',
        issuer_url: '',
      } as IMetaOverlayData,
      memberCardBrandingOverlayData,
    ],
  }
}

const createPersonCredentialBundle = (verified = true, demo = false): IOverlayBundleData => {
  const metaOverlays: IMetaOverlayData[] = []
  if (verified) {
    metaOverlays.push({
      capture_base: '',
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuer: demo ? 'Service BC DEMO' : 'Service BC',
      watermark: demo ? 'NON-PRODUCTION' : undefined,
      description: '',
      credential_help_text: '',
      credential_support_url: '',
      issuer_description: '',
      issuer_url: '',
      digest: '',
    })
    metaOverlays.push({
      capture_base: '',
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne',
      issuer: demo ? 'Service BC DEMO' : 'Service BC',
      watermark: demo ? 'NON-PRODUCTION (FR)' : undefined,
      description: '',
      credential_help_text: '',
      credential_support_url: '',
      issuer_description: '',
      issuer_url: '',
      digest: '',
    })
  } else {
    metaOverlays.push({
      capture_base: '',
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Unverified Person',
      issuer: 'Digital Identity and Trust Program',
      watermark: undefined,
      description: '',
      credential_help_text: '',
      credential_support_url: '',
      issuer_description: '',
      issuer_url: '',
      digest: '',
    })
    metaOverlays.push({
      capture_base: '',
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Unverified Personne',
      issuer: 'Digital Identity and Trust Program',
      watermark: undefined,
      description: '',
      credential_help_text: '',
      credential_support_url: '',
      issuer_description: '',
      issuer_url: '',
      digest: '',
    })
  }
  const overlay = {
    capture_base: {
      type: 'spec/capture_base/1.0',
      classification: '',
      digest: '',
      attributes: {
        postal_code: 'Text',
        given_names: 'Text',
        family_name: 'Text',
        locality: 'Text',
        region: 'Text',
        street_address: 'Text',
        country: 'Text',
        birthdate_dateint: 'DateInt',
      },
      flagged_attributes: [''],
    } as ICaptureBaseData,
    overlays: [
      ...metaOverlays,
      {
        capture_base: '',
        type: 'aries/overlays/branding/1.0',
        logo: require('./bc-logo.jpg'),
        primary_background_color: '#003366',
        background_image: require('./person-background-image.png'),
        primary_attribute: 'given_names',
        secondary_attribute: 'family_name',
      } as IBrandingOverlayData,
      {
        capture_base: '',
        type: 'spec/overlays/format/1.0',
        language: 'en',
        attribute_formats: {
          birthdate_dateint: 'YYYYMMDD',
          picture: 'image/jpeg',
        },
      } as IFormatOverlayData,
      {
        capture_base: '',
        type: 'spec/overlays/character_encoding/1.0',
        attribute_character_encoding: {
          picture: 'base64',
        },
        attr_character_encoding: {
          picture: 'base64',
        },
        default_character_encoding: 'utf-8',
      } as ICharacterEncodingOverlayData,
      {
        capture_base: '',
        type: 'spec/overlays/label/1.0',
        language: 'en',
        attribute_labels: {
          given_names: 'Given Names',
          family_name: 'Family Name',
          birthdate_dateint: 'Date of Birth',
          picture: 'Picture',
        },
        attribute_categories: [],
        category_labels: {},
      } as ILabelOverlayData,
      {
        capture_base: '',
        type: 'spec/overlays/label/1.0',
        language: 'fr',
        attribute_labels: {
          given_names: 'Prénoms',
          family_name: 'Nom de famille',
          birthdate_dateint: 'Date de naissance',
          picture: 'Image',
        },
        attribute_categories: [],
        category_labels: {},
      } as ILabelOverlayData,
    ],
  }
  if (demo && overlay.capture_base.attributes) {
    overlay.capture_base.attributes.picture = 'Binary'
  }
  return overlay
}

const unverifiedPersonCardBundle = createPersonCredentialBundle(false)

const digitalIdCardBundle = createPersonCredentialBundle()

const demoDigitalIdCardBundle = createPersonCredentialBundle(true, true)

const memberCardBundle = createMemberCardBundle()

const demoMemberCardBundle = createMemberCardBundle(true)

export default {
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/370
  [CREDENTIALS.LSBC_TEST]: memberCardBundle /* LSBC (TEST) */,
  [CREDENTIALS.LSBC_PROD]: memberCardBundle /* LSBC (PROD) */,
  // ↓↓↓ https://github.com/bcgov/BC-Wallet-Demo/discussions/59
  [CREDENTIALS.SHOWCASE_LAWYER_DEV]: demoMemberCardBundle /* Showcase LSBC (DEV) */,
  [CREDENTIALS.SHOWCASE_LAWYER_TEST]: demoMemberCardBundle /* Showcase LSBC (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER_PROD]: demoMemberCardBundle /* Showcase LSBC (PROD) */,
  [CREDENTIALS.SHOWCASE_STUDENT_DEV]: studentCardBundle /* Showcase Student (DEV) */,
  [CREDENTIALS.SHOWCASE_STUDENT_TEST]: studentCardBundle /* Showcase Student (TEST) */,
  [CREDENTIALS.SHOWCASE_STUDENT_PROD]: studentCardBundle /* Showcase Student (PROD) */,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/506
  [CREDENTIALS.UNVERIFIED_PERSON_DEV]: unverifiedPersonCardBundle /* Unverified Person (DEV) */,
  [CREDENTIALS.UNVERIFIED_PERSON_TEST]: unverifiedPersonCardBundle /* Unverified Person (TEST) */,
  [CREDENTIALS.UNVERIFIED_PERSON_PROD]: unverifiedPersonCardBundle /* Unverified Person (PROD) */,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/604
  [CREDENTIALS.PILOT_INVITE_DEV]: digitalIdInvitationCardBundle /* (DEV) */,
  [CREDENTIALS.PILOT_INVITE_TEST]: digitalIdInvitationCardBundle /* (TEST) */,
  [CREDENTIALS.PILOT_INVITE_PROD]: digitalIdInvitationCardBundle /* (PROD) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_DEV]: demoDigitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_TEST]: demoDigitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_PROD]: demoDigitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.BC_DIGITAL_ID_DEV]: demoDigitalIdCardBundle /* (DEV) */,
  [CREDENTIALS.BC_DIGITAL_ID_SIT]: demoDigitalIdCardBundle /* (SIT) */,
  [CREDENTIALS.BC_DIGITAL_ID_QA]: digitalIdCardBundle /* (QA) */,
  [CREDENTIALS.BC_DIGITAL_ID_PROD]: digitalIdCardBundle /* (PROD) */,
}
