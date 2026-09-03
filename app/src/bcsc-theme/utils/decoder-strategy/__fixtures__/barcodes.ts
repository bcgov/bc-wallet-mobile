/**
 * Shared PDF-417 fixtures for the decoder-strategy suites. All values are BC "SPECIMEN"
 * test cards, not real credentials.
 *
 * Only the one value containing a backslash uses String.raw; the rest are plain
 * strings so the tag is a signal rather than noise.
 */

export const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A =
  "%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=240919700906=?_%0AV8W3Y8                     M185 95BRNBLU9123456789                E$''C(R2S6L?"

export const BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B = String.raw`%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=250419470429=?_%0AV8W3Y8                     X160 57WHIBLU9123456789                E$!(\0CUPXD?`

export const BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C =
  '%BCVICTORIA^SPECIMEN,$TEST CARD^910 GOVERNMENT ST$VICTORIA BC  V8W 3Y8^?;6360282222222=260119820104=?_%0AV8W3Y8                     M185 88BRNBLU                          00S00023254?'

// 3-caret format (no extra ^ before track separator) — some real-world cards use this variant
export const BC_DL_BARCODE_3_CARET =
  '%BCVICTORIA^CPSIJSIT,$STANDALONE CITZ FOUR^910 GOVERNMENT ST$VICTORIA BC V8W 3Y5?;636028004023964=270419850410=?_%0AV8W3Y5                     F            9873904417                00C00015303?'

export const VALID_BC_DL_BARCODES = [
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_A,
  BC_COMBO_CARD_DL_BARCODE_NO_BCSC_B,
  BC_COMBO_CARD_DL_BARCODE_WITH_BCSC_C,
  BC_DL_BARCODE_3_CARET,
]
