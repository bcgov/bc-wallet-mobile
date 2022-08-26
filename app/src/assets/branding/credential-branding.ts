import { Overlay } from 'aries-bifold/App/types/overlay'

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

const branding: Record<string, Overlay> = {
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/370
  'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1': demoMemberCardOverlay, /* LSBC (TEST) */
  '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1': memberCardOverlay, /* LSBC (PROD) */
  // ↓↓↓ https://github.com/bcgov/BC-Wallet-Demo/discussions/59
  'Trx3R1frdEzbn34Sp1jyX:2:Member Card:1.5.1': demoMemberCardOverlay,  /* Showcase LSBC (DEV) */
  '63ZiwyeZeazA6AhYRYm2zD:2:Member Card:1.5.1': demoMemberCardOverlay, /* Showcase LSBC (TEST) */
  'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1': demoMemberCardOverlay, /* Showcase LSBC (PROD) */
  'Trx3R1frdEzbn34Sp1jyX:2:student_card:1.0': studentCardOverlay,  /* Showcase Student (DEV) */
  '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0': studentCardOverlay, /* Showcase Student (TEST) */
  'XUxBrVSALWHLeycAUhrNr9:2:student_card:1.0': studentCardOverlay, /* Showcase Student (PROD) */
  // ↓↓↓ https://github.com/bcgov/bc-wallet-mobile/discussions/506
  'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0': idCardOverlay, /* Unverified Person (DEV) */
  'XZQpyaFa9hBUdJXfKHUvVg:2:unverified_person:0.1.0': idCardOverlay, /* Unverified Person (TEST) */
  '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0': idCardOverlay, /* Unverified Person (DEV) */
}

export default branding
