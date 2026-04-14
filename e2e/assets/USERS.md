# BC Services Card — E2E test accounts

Test accounts created in the **SIT** environment. All values below (serials, PHNs, ICBC IDs) are fake. Card serial numbers match the barcodes embedded in the corresponding `dl_*.jpg` asset images.

## Test users (Scooby-Doo themed)

One persona per **card type**.

- **Serials / PHN / ICBC / doc IDs:** unique, obviously fake values.
- **Email domain:** use your org's disposable test domain if required.

| Card type        | Username     | Surname | Given 1 | DOB        | Documented sex |
| ---------------- | ------------ | ------- | ------- | ---------- | -------------- |
| Standalone photo | `e2e_shaggy` | Rogers  | Shaggy  | 1969-09-13 | Male           |
| Combo            | `e2e_velma`  | Dinkley | Velma   | 1995-12-17 | Female         |
| Non-Photo        | `e2e_daphne` | Blake   | Daphne  | 1980-09-22 | Female         |
| N/A              | `e2e_fred`   | Jones   | Fred    | 1968-09-18 | Male           |

---

## Fake IDs

All values are fabricated for testing — **do not** use real PHNs or real card data.

| Username     | Card serial | Card issue date | Card expiry date | DOB          | PHN (fake)   | ICBC ID (fake) |
| ------------ | ----------- | --------------- | ---------------- | ------------ | ------------ | -------------- |
| `e2e_shaggy` | `C74455103` | `2022-09-13`    | `2026-09-13`     | `1969-09-13` | `5171963054` | `793501815`    |
| `e2e_velma`  | `C82643367` | `2026-03-24`    | `2031-03-23`     | `1995-12-17` | `5892454574` | `111442027`    |
| `e2e_daphne` | `C26444539` | `2026-03-24`    | `2031-03-23`     | `1980-09-22` | `6270487024` | `774425241`    |
| `e2e_fred`   | `N/A`       | `N/A`           | `N/A`            | `1968-09-18` | `N/A`        | `N/A`          |
