# BC Services Card — E2E test accounts

Test accounts created in the **SIT** environment. All values below (serials, PHNs, ICBC IDs) are fake. Card serial numbers match the barcodes embedded in the corresponding `dl_*.jpg` asset images.

## Test users (Scooby-Doo themed)

One persona per **card type**, plus Scrappy — a second photo card, distinguished by being **under 12** rather than by type.

- **Serials / PHN / ICBC / doc IDs:** unique, obviously fake values.
- **Email domain:** use your org's disposable test domain if required.

| Card type        | Username       | Surname | Given 1 | DOB        | Documented sex |
| ---------------- | -------------- | ------- | ------- | ---------- | -------------- |
| Standalone photo | `e2e_shaggy_2` | Rogers  | Shaggy  | 1998-11-14 | Male           |
| Combo            | `e2e_velma`    | Dinkley | Velma   | 1995-12-17 | Female         |
| Non-Photo        | `e2e_daphne`   | Blake   | Daphne  | 1980-09-22 | Female         |
| N/A              | `e2e_fred`     | Jones   | Fred    | 1968-09-18 | Male           |
| Photo, under 12  | `e2e_scrappy`  | Doo     | Scrappy | 2020-01-01 | TBD            |

`e2e_shaggy_2` replaces the original `e2e_shaggy` (serial `C74455103`), whose card expired 2026-09-13.

---

## Fake IDs

All values are fabricated for testing — **do not** use real PHNs or real card data.

| Username       | Card serial | Card issue date | Card expiry date | DOB          | PHN (fake)   | ICBC ID (fake) |
| -------------- | ----------- | --------------- | ---------------- | ------------ | ------------ | -------------- |
| `e2e_shaggy_2` | `C42606379` | `TBD`           | `TBD`            | `1998-11-14` | `TBD`        | `TBD`          |
| `e2e_velma`    | `C82643367` | `2026-03-24`    | `2031-03-23`     | `1995-12-17` | `5892454574` | `111442027`    |
| `e2e_daphne`   | `C26444539` | `2026-03-24`    | `2031-03-23`     | `1980-09-22` | `6270487024` | `774425241`    |
| `e2e_fred`     | `N/A`       | `N/A`           | `N/A`            | `1968-09-18` | `N/A`        | `N/A`          |
| `e2e_scrappy`  | `C30397560` | `TBD`           | `TBD`            | `2020-01-01` | `TBD`        | `TBD`          |

**`TBD` cells need the values from the minting process.** The expiry dates matter beyond documentation — persona expiry is what retired the original `e2e_shaggy`, so fill them in rather than leaving them blank.

---

## Registration documents

The document numbers and IDIM type IDs each persona registers with live in `src/constants.ts`
(`documentNumber` / `documentTypeId` and, for two-document flows, `primaryDocumentNumber` /
`primaryDocumentTypeId`). `src/flows/verify.ts` turns them into the approval payload per the persona's `flow`.

## Under-12 behaviour

`e2e_scrappy` exists for the two age-dependent behaviours, both covered by
`test/bcsc/verify/under-12.journey.ts`:

- The backend offers a minor **in-person only** at verification-method selection.
- Settings → Add device routes to the age-restriction screen instead of the transfer QR flow.

The client-side under-12 rejection on the typed non-BCSC evidence form does **not** need this persona — it is
a typed birthdate, covered inside `test/bcsc/verify/verified-non-bcsc.journey.ts`.
