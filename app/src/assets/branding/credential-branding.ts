import { Overlay } from 'aries-bifold/App/types/overlay'

const branding: Record<string, Overlay> = {
  'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1': {
    imageSource: require('./lsbc-member-card.png'),
    header: {
      imageSource: require('./lsbc-header-logo.png'),
      backgroundColor: '#00698C',
      hideIssuer: true,
    },
  },
  'Trx3R1frdEzbn34Sp1jyX:2:student_card:1.0': {
    imageSource: require('./best-bc-student-card.png'),
    header: {
      imageSource: require('./best-bc-header-logo.png'),
      color: '#FFFFFF',
    },
    footer: { color: '#FFFFFF' },
  },
}

export default branding
