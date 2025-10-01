export enum BCSCCardType {
  Combined = 'BC Services Card Combo', // IAS value
  Photo = 'BC Services Card Photo', // IAS value
  NonPhoto = 'BC Services Card Non-Photo', // IAS value
  Other = 'Non BC Services Card(s)', // Transform undefined card_type to 'Other' (ie: non-BCSC card)
  None = 'None', // Local value when no card is present
}

export enum BCSCCardProcess {
  BCSC = 'IDIM L3 Remote BCSC Photo Identity Verification',
  BCSCNonPhoto = 'IDIM L3 Remote BCSC Non-Photo Identity Verification',
  NonBCSC = 'IDIM L3 Remote Non-BCSC Identity Verification',
}
