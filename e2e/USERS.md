# BC Services Card — E2E test accounts

Reference for **Create a Test Account** in the test portal. Use generated or placeholder values where the portal allows; align with your environment’s rules for serials, PHN, and document IDs.

## Portal metadata

| Field      | Value                    |
| ---------- | ------------------------ |
| Group code | `SingleAppDevs`          |
| Client     | BC Services Card Account |

## Account fields

| Field     | Notes                          |
| --------- | ------------------------------ |
| Username  | Unique per user (see below)    |
| Password  | Per your vault / team standard |
| Email     | Unique per user                |
| Card type | One of the four options below  |

## Additional account information

### Card & identity

| Field              | Notes                                      |
| ------------------ | ------------------------------------------ |
| Card serial number | Portal-specific format                     |
| Card issue date    | `YYYY-MM-DD`                               |
| Card expiry date   | After issue date                           |
| Date of birth      | `YYYY-MM-DD`                               |
| ICBC client ID     | Numeric / env-specific                     |
| PHN                | BC Personal Health Number (test-safe fake) |
| Documented sex     | Male · Female · Diverse · Unknown          |

### Names & photo

| Field            | Notes         |
| ---------------- | ------------- |
| Surname          |               |
| Given name 1     |               |
| Given name 2     | Optional      |
| Given name 3     | Optional      |
| Card name line 1 | As on card    |
| Card name line 2 | Optional      |
| Photo            | Per card type |

### Addresses

| Field               | Notes       |
| ------------------- | ----------- |
| Card address line 1 |             |
| Card address line 2 | Optional    |
| Card address line 3 | Optional    |
| Card address line 4 | Optional    |
| Postal code         | BC format   |
| Mailing address     | If required |

### Identity verification documents

| Field                                    | Notes |
| ---------------------------------------- | ----- |
| Primary doc type                         |       |
| Primary document ID / reference number   |       |
| Secondary doc type                       |       |
| Secondary document ID / reference number |       |

---

## Test users (Scooby-Doo themed)

One persona per **card type**. **Shared conventions (replace with env-specific values):**

- **Password:** use one team-wide test secret (not committed), e.g. vault-stored `E2E_BCSC_TEST_PASSWORD`.
- **Serials / PHN / ICBC / doc IDs:** use unique, obviously fake values unless your portal supplies generators.
- **Email domain:** use your org’s disposable test domain if required.

| Card type        | Username       | Email                            | Surname | Given 1  | Card name line 1 | DOB        | Documented sex | Card address (suggested)                                   |
| ---------------- | -------------- | -------------------------------- | ------- | -------- | ---------------- | ---------- | -------------- | ---------------------------------------------------------- |
| Standalone photo | `e2e.scoobert` | `scoobert.doo+e2e@example.test`  | Doo     | Scoobert | SCOOBERT DOO     | 1969-09-13 | Male           | `100 Mystery Machine Way`, `Crystal Cove`, `BC`, `V6B 1Z0` |
| Combo            | `e2e.velma`    | `velma.dinkley+e2e@example.test` | Dinkley | Velma    | V DINKLEY        | 1971-09-30 | Female         | `200 Spooky Swamp Rd`, `Coolsville`, `BC`, `V5K 0A1`       |
| Non-Photo        | `e2e.daphne`   | `daphne.blake+e2e@example.test`  | Blake   | Daphne   | D BLAKE          | 1971-06-17 | Female         | `333 Haunted Hill Dr`, `Mystery Bay`, `BC`, `V8W 1N4`      |
| N/A              | `e2e.fred`     | `fred.jones+e2e@example.test`    | Jones   | Fred     | F JONES          | 1971-02-01 | Male           | `404 Trapmaster Ct`, `Crystal Cove`, `BC`, `V7Y 2E2`       |

---

## Example fake IDs (optional pattern)

Use only if your portal accepts arbitrary test digits; **do not** use real PHNs or real card data.

| Username       | Example card serial | Example PHN (fake) | Example ICBC ID (fake) |
| -------------- | ------------------- | ------------------ | ---------------------- |
| `e2e.scoobert` | `SC1000001`         | `912345678`        | `10000001`             |
| `e2e.velma`    | `SC1000002`         | `912345679`        | `10000002`             |
| `e2e.daphne`   | `SC1000003`         | `912345680`        | `10000003`             |
| `e2e.fred`     | `SC1000004`         | `912345681`        | `10000004`             |
