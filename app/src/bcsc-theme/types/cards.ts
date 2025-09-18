export enum BCSCCardType {
  None = 'None',
  Combined = 'Combined Services Card and Driver License',
  Photo = 'BC Services Card with Photo',
  NonPhoto = 'BC Services Card without Photo',
  Other = 'Other ID(s)',
}

export enum BCSCCardProcess {
  BCSC = 'IDIM L3 Remote BCSC Photo Identity Verification',
  BCSCNonPhoto = 'IDIM L3 Remote BCSC Non-Photo Identity Verification',
  NonBCSC = 'IDIM L3 Remote Non-BCSC Identity Verification',
}
