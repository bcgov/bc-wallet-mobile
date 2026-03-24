# BC Services Card — E2E test accounts

Reference for **Create a Test Account** in the test portal. Use generated or placeholder values where the portal allows; align with your environment’s rules for serials, PHN, and document IDs.

## Test users (Scooby-Doo themed)

One persona per **card type**. **Shared conventions (replace with env-specific values):**

- **Password:** use one team-wide test secret (not committed), e.g. vault-stored `E2E_BCSC_TEST_PASSWORD`.
- **Serials / PHN / ICBC / doc IDs:** use unique, obviously fake values unless your portal supplies generators.
- **Email domain:** use your org’s disposable test domain if required.

| Card type        | Username     | PASSWORD   | Surname | Given 1 | DOB        | Documented sex |
| ---------------- | ------------ | ---------- | ------- | ------- | ---------- | -------------- |
| Standalone photo | `e2e_shaggy` | `password` | Rogers  | Shaggy  | 1969-09-13 | Male           |
| Combo            | `e2e_velma`  | `password` | Dinkley | Velma   | 1995-12-17 | Female         |
| Non-Photo        | `e2e_daphne` | `password` | Blake   | Daphne  | 1980-09-22 | Female         |
| N/A              | `e2e_fred`   | `password` | Jones   | Fred    | 1968-09-18 | Male           |

---

## Example fake IDs (optional pattern)

Use only if your portal accepts arbitrary test digits; **do not** use real PHNs or real card data.

| Username     | Example card serial | Card issue date | Card Expiry Date | DOB          | Example PHN (fake) | Example ICBC ID (fake) |
| ------------ | ------------------- | --------------- | ---------------- | ------------ | ------------------ | ---------------------- |
| `e2e_shaggy` | `C74455103`         | `2022-09-13`    | `2026-09-13`     | `1969-09-13` | `5171963054`       | `793501815`            |
| `e2e_velma`  | `C82643367`         | `2026-03-24`    | `2031-03-23`     | `1995-12-17` | `5892454574`       | `111442027`            |
| `e2e_daphne` | `C26444539`         | `2026-03-24`    | `2031-03-23`     | `1980-09-22` | `6270487024`       | `774425241`            |
| `e2e_fred`   | `N/A`               | `N/A`           | `N/A`            | `1968-09-18` | `N/A`              | `N/A`                  |
