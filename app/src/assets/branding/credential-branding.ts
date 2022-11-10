export enum CREDENTIALS {
  LSBC_TEST = 'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default',
  LSBC_PROD = '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default',
  SHOWCASE_LAWYER_DEV = 'Trx3R1frdEzbn34Sp1jyX:2:Member Card:1.5.1',
  SHOWCASE_LAWYER_TEST = '63ZiwyeZeazA6AhYRYm2zD:2:Member Card:1.5.1',
  SHOWCASE_LAWYER_PROD = 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1',
  SHOWCASE_STUDENT_DEV = 'Trx3R1frdEzbn34Sp1jyX:2:student_card:1.0',
  SHOWCASE_STUDENT_TEST = '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0',
  SHOWCASE_STUDENT_PROD = 'XUxBrVSALWHLeycAUhrNr9:2:student_card:1.0',
  SHOWCASE_LAWYER2_PERSON_DEV = 'Trx3R1frdEzbn34Sp1jyX:3:CL:28328:Person',
  UNVERIFIED_PERSON_DEV = 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_TEST = 'XZQpyaFa9hBUdJXfKHUvVg:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_PROD = '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0',
  PILOT_INVITE_DEV = 'Mp2pDQqS2eSjNVA7kXc8ut:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_TEST = '4zBepKVWZcGTzug4X49vAN:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_PROD = 'E2h4RUJxyh48PLJ1CtGJrq:2:BC VC Pilot Certificate:1.0.1',
  BC_DIGITAL_ID_QA = 'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:Person (QA)',
  BC_DIGITAL_ID_SIT = '7xjfawcnyTUcduWVysLww5:3:CL:28075:Person (SIT)',
  BC_DIGITAL_ID_PROD = 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
}

const demoMemberCardOverlay = {
  imageSource: require('./lsbc-member-card-demo.png'),
  header: {
    imageSource: require('./lsbc-header-logo.png'),
    backgroundColor: '#00698C',
    hideIssuer: true,
  },
}

const memberCardOverlay = {
  imageSource: require('./lsbc-member-card.png'),
  header: {
    imageSource: require('./lsbc-header-logo.png'),
    backgroundColor: '#00698C',
    hideIssuer: true,
  },
}

const studentCardOverlay = {
  imageSource: require('./best-bc-student-card.png'),
  header: {
    imageSource: require('./best-bc-header-logo.png'),
    color: '#FFFFFF',
  },
  footer: { color: '#FFFFFF' },
}

const digitalIdInvitationCardOverlay = {
  imageSource: require('./invitation-card.png'),
  header: {
    imageSource: require('./service-bc-header-logo.png'),
    color: '#FFFFFF',
    footer: { color: '#FFFFFF' },
  },
}

const createPersonCredentialBundle = (backgroundImageSource: any, verified = true) => {
  const metaOverlays = []
  if (verified) {
    metaOverlays.push({
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuerName: 'Service BC',
    })
    metaOverlays.push({
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne',
      issuerName: 'Service BC',
    })
  } else {
    metaOverlays.push({
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Unverified Person',
      issuerName: 'DITP',
    })
    metaOverlays.push({
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Unverified Personne',
      issuerName: 'DITP',
    })
  }
  return {
    capture_base: {
      attributes: {
        postal_code: 'Text',
        //picture: 'Text',
        given_names: 'Text',
        family_name: 'Text',
        locality: 'Text',
        region: 'Text',
        street_address: 'Text',
        country: 'Text',
        //expiry_date_dateint: 'Text',
        //birthdate_dateint: 'Text',
      },
    },
    overlays: [
      ...metaOverlays,
      {
        type: 'spec/overlays/card_layout/1.0',
        imageSource: backgroundImageSource,
        header: {
          imageSource: require('./service-bc-header-logo.png'),
          color: '#FFFFFF',
        },
        footer: { color: '#FFFFFF' },
      },
      {
        type: 'spec/overlays/label/1.0',
        language: 'en',
        attr_labels: {
          given_names: 'Given Name',
          family_name: 'Family Name',
        },
      },
      {
        type: 'spec/overlays/label/1.0',
        language: 'fr',
        attr_labels: {
          given_names: 'Prénoms',
          family_name: 'Nom de famille',
        },
      },
    ],
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const unverifiedPersonCardBundle = createPersonCredentialBundle(require('./service-bc-id-card-test.png'), false)

// eslint-disable-next-line @typescript-eslint/no-var-requires
const digitalIdCardBundle = createPersonCredentialBundle(require('./service-bc-id-card.png'))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testDigitalIdCardBundle = createPersonCredentialBundle(require('./service-bc-id-card-test.png'))

const demoMemberCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Member Card',
      issuerName: 'Law Society of BC',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...demoMemberCardOverlay,
    },
  ],
}

const memberCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Member Card',
      issuerName: 'Law Society of BC',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...memberCardOverlay,
    },
  ],
}

const studentCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Student',
      issuerName: 'BestBC College',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...studentCardOverlay,
    },
  ],
}

const digitalIdInvitationCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Pilot Invitation',
      issuerName: 'DITP',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...digitalIdInvitationCardOverlay,
    },
  ],
}

export default {
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/370
  /* LSBC (TEST) */
  [CREDENTIALS.LSBC_TEST]: demoMemberCardBundle,
  [CREDENTIALS.LSBC_PROD]: memberCardBundle /* LSBC (PROD) */,
  // ↓↓↓ https://github.com/bcgov/BC-Wallet-Demo/discussions/59
  [CREDENTIALS.SHOWCASE_LAWYER_DEV]: demoMemberCardBundle /* Showcase LSBC (DEV) */,
  [CREDENTIALS.SHOWCASE_LAWYER_TEST]: demoMemberCardBundle /* Showcase LSBC (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER_PROD]: demoMemberCardBundle /* Showcase LSBC (PROD) */,
  [CREDENTIALS.SHOWCASE_STUDENT_DEV]: studentCardBundle /* Showcase Student (DEV) */,
  [CREDENTIALS.SHOWCASE_STUDENT_TEST]: studentCardBundle /* Showcase Student (TEST) */,
  /* Showcase Student (PROD) */
  [CREDENTIALS.SHOWCASE_STUDENT_PROD]: studentCardBundle,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/506
  [CREDENTIALS.UNVERIFIED_PERSON_DEV]: unverifiedPersonCardBundle /* Unverified Person (DEV) */,
  [CREDENTIALS.UNVERIFIED_PERSON_TEST]: unverifiedPersonCardBundle /* Unverified Person (TEST) */,
  [CREDENTIALS.UNVERIFIED_PERSON_PROD]: unverifiedPersonCardBundle /* Unverified Person (DEV) */,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/604
  [CREDENTIALS.PILOT_INVITE_TEST]: digitalIdInvitationCardBundle /* (TEST) */,
  'XpgeQa93eZvGSZBZef3PHn:2:Person:0.1': testDigitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.SHOWCASE_LAWYER2_PERSON_DEV]: testDigitalIdCardBundle /* (TEST) */,
  [CREDENTIALS.BC_DIGITAL_ID_QA]: testDigitalIdCardBundle /* (QA) */,
  [CREDENTIALS.BC_DIGITAL_ID_SIT]: testDigitalIdCardBundle /* (SIT) */,
  [CREDENTIALS.BC_DIGITAL_ID_PROD]: digitalIdCardBundle /* (PROD) */,
}
