import { Overlay } from 'aries-bifold/App/types/overlay'

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

const idCardOverlay = {}

const branding: Record<string, Overlay> = {
  'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1': memberCardOverlay,
  '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1': memberCardOverlay,
  'Trx3R1frdEzbn34Sp1jyX:2:student_card:1.0': studentCardOverlay,
  '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0': studentCardOverlay,
  'XUxBrVSALWHLeycAUhrNr9:2:student_card:1.0': studentCardOverlay,
}

export default branding
