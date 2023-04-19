import { types } from 'aries-bifold'

type CardLayoutOverlay11 = types.oca.CardLayoutOverlay11
type MetaOverlay = types.oca.MetaOverlay
type FormatOverlay = types.oca.FormatOverlay
type LabelOverlay = types.oca.LabelOverlay
type CaptureBaseOverlay = types.oca.CaptureBaseOverlay

export enum CREDENTIALS {
  LSBC_TEST = 'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default',
  LSBC_PROD = '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default',
  SHOWCASE_LAWYER_DEV = '2K2h7kf8VGTLtfoxJgWazf:2:Member Card:1.5.1',
  SHOWCASE_LAWYER_TEST = '63ZiwyeZeazA6AhYRYm2zD:2:Member Card:1.5.1',
  SHOWCASE_LAWYER_PROD = 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1',
  SHOWCASE_STUDENT_DEV = '2K2h7kf8VGTLtfoxJgWazf:2:student_card:1.0',
  SHOWCASE_STUDENT_TEST = '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0',
  SHOWCASE_STUDENT_PROD = 'XUxBrVSALWHLeycAUhrNr9:2:student_card:1.0',
  SHOWCASE_LAWYER2_PERSON_DEV = '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.0',
  SHOWCASE_LAWYER2_PERSON_TEST = '63ZiwyeZeazA6AhYRYm2zD:2:Person:1.0',
  SHOWCASE_LAWYER2_PERSON_PROD = 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
  UNVERIFIED_PERSON_DEV = 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_TEST = 'HTkhhCW1bAXWnxC1u3YVoa:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_PROD = 'YXCtXE4YhVjULgj5hrk4ML:2:unverified_person:0.1.0',
  PILOT_INVITE_DEV = 'Mp2pDQqS2eSjNVA7kXc8ut:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_TEST = '4zBepKVWZcGTzug4X49vAN:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_PROD = 'E2h4RUJxyh48PLJ1CtGJrq:2:BC VC Pilot Certificate:1.0.1',
  BC_DIGITAL_ID_QA = 'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:Person (QA)',
  BC_DIGITAL_ID_SIT = '7xjfawcnyTUcduWVysLww5:3:CL:28075:Person (SIT)',
  BC_DIGITAL_ID_PROD = 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
}

const digitalIdInvitationCardOverlay: CardLayoutOverlay11 = {
  captureBase: '',
  type: 'spec/overlays/card_layout/1.1',
  logo: {
    src: require('./bc-logo.jpg'),
  },
  primaryBackgroundColor: '#003366',
  backgroundImageSlice: {
    src: require('./invitation-background-image-slice.png'),
  },
}

const studentCardOverlay: CardLayoutOverlay11 = {
  captureBase: '',
  type: 'spec/overlays/card_layout/1.1',
  logo: {
    src: require('./best-bc-logo.png'),
  },
  primaryBackgroundColor: '#32674e',
  backgroundImage: {
    src: require('./best-bc-background-image.jpg'),
  },
  backgroundImageSlice: {
    src: require('./best-bc-background-image-slice.png'),
  },
}

const memberCardOverlay: CardLayoutOverlay11 = {
  captureBase: '',
  type: 'spec/overlays/card_layout/1.1',
  logo: {
    src: require('./lsbc-logo.png'),
  },
  primaryBackgroundColor: '#00698c',
  secondaryBackgroundColor: '#1a2930',
  backgroundImage: {
    src: require('./lsbc-background-image.jpg'),
  },
}

const digitalIdInvitationCardBundle = {
  captureBase: {} as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Pilot Invitation',
      issuerName: 'Digital Identity and Trust Program',
    } as MetaOverlay,
    digitalIdInvitationCardOverlay,
  ],
}

const studentCardBundle = {
  captureBase: {} as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Student',
      issuerName: 'BestBC College',
    } as MetaOverlay,
    studentCardOverlay,
  ],
}

const memberCardBundle = {
  captureBase: {} as CaptureBaseOverlay,
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Member Card',
      issuerName: 'Law Society of BC',
    } as MetaOverlay,
    memberCardOverlay,
  ],
}

const createPersonCredentialBundle = (backgroundImageSource: string, verified = true) => {
  const metaOverlays: MetaOverlay[] = []
  if (verified) {
    metaOverlays.push({
      captureBase: '',
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuerName: 'Service BC',
    })
    metaOverlays.push({
      captureBase: '',
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne',
      issuerName: 'Service BC',
    })
  } else {
    metaOverlays.push({
      captureBase: '',
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Unverified Person',
      issuerName: 'Digital Identity and Trust Program',
    })
    metaOverlays.push({
      captureBase: '',
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne non verifiée',
      issuerName: "Programme d'identité numérique et de confiance",
    })
  }
  return {
    captureBase: {
      captureBase: '',
      type: 'spec/overlays/capture_base/1.0',
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
    } as CaptureBaseOverlay,
    overlays: [
      ...metaOverlays,
      {
        captureBase: '',
        type: 'spec/overlays/card_layout/1.1',
        logo: {
          src: require('./bc-logo.jpg'),
        },
        primaryBackgroundColor: '#003366',
        backgroundImage: {
          src: backgroundImageSource,
        },
        primaryAttribute: {
          name: 'given_names',
        },
        secondaryAttribute: {
          name: 'family_name',
        },
      } as CardLayoutOverlay11,
      {
        captureBase: '',
        type: 'spec/overlays/format/1.0',
        language: 'en',
        attributeFormats: {
          birthdate_dateint: 'YYYYMMDD',
        },
      } as FormatOverlay,
      {
        captureBase: '',
        type: 'spec/overlays/format/1.0',
        language: 'fr',
        attributeFormats: {
          birthdate_dateint: 'DDMMYYYY',
        },
      } as FormatOverlay,
      {
        captureBase: '',
        type: 'spec/overlays/label/1.0',
        language: 'en',
        attributeLabels: {
          given_names: 'Given Name',
          family_name: 'Family Name',
          birthdate_dateint: 'Date of Birth',
        },
      } as LabelOverlay,
      {
        captureBase: '',
        type: 'spec/overlays/label/1.0',
        language: 'fr',
        attributeLabels: {
          given_names: 'Prénoms',
          family_name: 'Nom de famille',
        },
      } as LabelOverlay,
    ],
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const unverifiedPersonCardBundle = createPersonCredentialBundle(require('./person-background-image.png'), false)

// eslint-disable-next-line @typescript-eslint/no-var-requires
const digitalIdCardBundle = createPersonCredentialBundle(require('./person-background-image.png'))

export default {
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/370
  [CREDENTIALS.LSBC_TEST]: memberCardBundle /* LSBC (TEST) */,
  [CREDENTIALS.LSBC_PROD]: memberCardBundle /* LSBC (PROD) */,
  // ↓↓↓ https://github.com/bcgov/BC-Wallet-Demo/discussions/59
  [CREDENTIALS.SHOWCASE_LAWYER_DEV]: memberCardBundle /* Showcase LSBC (DEV) */,
  [CREDENTIALS.SHOWCASE_LAWYER_TEST]: memberCardBundle /* Showcase LSBC (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER_PROD]: memberCardBundle /* Showcase LSBC (PROD) */,
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
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_DEV]: digitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_TEST]: digitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_PROD]: digitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.BC_DIGITAL_ID_QA]: digitalIdCardBundle /* (QA) */,
  [CREDENTIALS.BC_DIGITAL_ID_SIT]: digitalIdCardBundle /* (SIT) */,
  [CREDENTIALS.BC_DIGITAL_ID_PROD]: digitalIdCardBundle /* (PROD) */,
}
