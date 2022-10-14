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

const idCardOverlay = {
  imageSource: require('./service-bc-id-card.png'),
  header: {
    imageSource: require('./service-bc-header-logo.png'),
    color: '#FFFFFF',
  },
  footer: { color: '#FFFFFF' },
}

const digitalIdInvitationCardOverlay = {
  imageSource: require('./invitation-card.png'),
  header: {
    imageSource: require('./service-bc-header-logo.png'),
    hideIssuer: true,
    color: '#FFFFFF',
    mapping: {
      credentialLabel: 'BC Digital ID Invitation',
    },
    footer: { color: '#FFFFFF' },
  },
}

const digitalIdCardOverlay = {
  imageSource: require('./service-bc-id-card.png'),
  header: {
    imageSource: require('./service-bc-header-logo.png'),
    color: '#FFFFFF',
    mapping: {
      connectionLabel: 'Service BC',
      credentialLabel: 'Person',
    },
  },
  footer: { color: '#FFFFFF' },
}

const idCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuer_name: 'Service BC',
    },
    {
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne',
      issuer_name: 'Service BC',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...idCardOverlay,
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

const digitalIdCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuer_name: 'Service BC',
    },
    {
      type: 'spec/overlays/meta/1.0',
      language: 'fr',
      name: 'Personne',
      issuer_name: 'Service BC',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...digitalIdCardOverlay,
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

const demoMemberCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Person',
      issuer_name: 'Law Society of BC',
    },
    {
      type: 'spec/overlays/card_layout/1.0',
      ...demoMemberCardOverlay,
    },
    {
      type: 'spec/overlays/label/1.0',
      language: 'en',
      attr_labels: {
        given_names: 'Given Name',
        family_name: 'Family Name',
      },
    },
  ],
}

const memberCardBundle = {
  capture_base: {},
  overlays: [
    {
      type: 'spec/overlays/meta/1.0',
      language: 'en',
      name: 'Member',
      issuer_name: 'Law Society of BC',
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
      issuer_name: 'BestBC College',
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
      issuer_name: 'DITP',
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
  'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1': demoMemberCardBundle,
  '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1': memberCardBundle /* LSBC (PROD) */,
  // ↓↓↓ https://github.com/bcgov/BC-Wallet-Demo/discussions/59
  'Trx3R1frdEzbn34Sp1jyX:2:Member Card:1.5.1': demoMemberCardBundle /* Showcase LSBC (DEV) */,
  '63ZiwyeZeazA6AhYRYm2zD:2:Member Card:1.5.1': demoMemberCardBundle /* Showcase LSBC (TEST) */,
  'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1': demoMemberCardBundle /* Showcase LSBC (PROD) */,
  'Trx3R1frdEzbn34Sp1jyX:2:student_card:1.0': studentCardBundle /* Showcase Student (DEV) */,
  '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0': studentCardBundle /* Showcase Student (TEST) */,
  /* Showcase Student (PROD) */
  'XUxBrVSALWHLeycAUhrNr9:2:student_card:1.0': studentCardBundle,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/506
  'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0': idCardBundle /* Unverified Person (DEV) */,
  'XZQpyaFa9hBUdJXfKHUvVg:2:unverified_person:0.1.0': idCardBundle /* Unverified Person (TEST) */,
  '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0': idCardBundle /* Unverified Person (DEV) */,
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/604
  '3Lbd5wSSSBv1xtjwsQ36sj:2:BC VC Pilot Certificate:1.0.1': digitalIdInvitationCardBundle /* (TEST) */,
  'XpgeQa93eZvGSZBZef3PHn:2:Person:0.1': digitalIdCardBundle /* (TEST) */,
}
