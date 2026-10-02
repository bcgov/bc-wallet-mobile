/**
 * Shared PDF-417 fixtures for the card barcode suites. All values are BC "SPECIMEN"
 * test cards, not real credentials.
 *
 * Names give the card type and the prefix letter of the DCN in the security field; NO_DCN
 * means that field holds none.
 *
 * Only the one value containing a backslash uses String.raw; the rest are plain
 * strings so the tag is a signal rather than noise.
 */

export const BC_DL_BARCODE_NO_DCN_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

export const BC_DL_BARCODE_NO_DCN_B = String.raw`%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250419470429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\0CUPXD?`

export const BC_DL_BARCODE_S =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

// Built from the S specimen above (K DCN plus a health number), not captured from a real card.
export const BC_COMBO_BARCODE_K =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU9123456789                00K00023254?'

// Built from the S specimen above (Y DCN, no health number), not captured from a real card.
export const BC_BCID_BARCODE_Y =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00Y00023254?'

// 3-caret format (no extra ^ before track separator) — some real-world cards use this variant
export const BC_BCSC_BARCODE_C =
  '%BCVICTORIA^CPSIJSIT,$STANDALONE CITZ FOUR^910 GOVERNMENT ST$VICTORIA BC V8W 3Y5?;636028004023964=270419850410=?_%0AV8W3Y5                     F            9873904417                00C00015303?'

// Multi-word last name — regression fixtures for the middleNames parsing bug, where words (and
// the literal ',$' delimiter) from a multi-word last name used to leak into middleNames.
export const BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE =
  "%BCVICTORIA^VAN BERG,$ANNA^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

export const BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE =
  "%BCVICTORIA^DE LA CRUZ,$MARIA ELENA^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

// Mononym — the '$' delimiter is still present with nothing after it, matching the app's own
// manual-entry convention of recording a mononym in the last name with an empty first name.
export const BC_DL_BARCODE_MONONYM =
  "%BCVICTORIA^CHER,$^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

// Mononym variant with no '$' at all — we have no confirmed real-world sample of this shape,
// but the parser shouldn't crash on it either way. See parseLicenseNames's '?? ''' guard.
export const BC_DL_BARCODE_MONONYM_NO_DOLLAR =
  "%BCVICTORIA^CHER,^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

export const VALID_BC_DL_BARCODES = [
  BC_DL_BARCODE_NO_DCN_A,
  BC_DL_BARCODE_NO_DCN_B,
  BC_DL_BARCODE_S,
  BC_BCSC_BARCODE_C,
  BC_COMBO_BARCODE_K,
  BC_BCID_BARCODE_Y,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_NO_MIDDLE,
  BC_DL_BARCODE_MULTIWORD_LASTNAME_WITH_MIDDLE,
  BC_DL_BARCODE_MONONYM,
  BC_DL_BARCODE_MONONYM_NO_DOLLAR,
]
