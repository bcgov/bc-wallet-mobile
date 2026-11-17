# Moving data from native storage to app storage

How to move a saved record from the native BCSC module (Swift and Kotlin) into app storage (TypeScript). It covers the storage tickets under #4341: #4426 and #5009–#5012. Other native work, such as notifications (#4420), PIN lockout (#4423) and the parked JWT tickets, needs its own approach.

In short: **import the data once, check it, then retire the native copy.** Every step must be safe to repeat if the app is closed partway through.

## The rules

### 1. Track each import with a marker

Each record gets its own "imported" marker. Never import just because the app store is empty: an empty store may mean the user cleared it, and re-importing would bring deleted data back.

- Give markers a version (for example `bookmarks.v1`) so a later re-import can run under a new one.
- Keep markers per account and environment, like their records.
- Resets clear the record but keep the marker. Removing the account clears the marker only after the native data is gone.

### 2. Copy, check, retire, then mark done

Read the native data, validate it, save it, confirm the save, retire the native copy, then set the marker. If the app crashes at any step, the import runs again next launch, and running it twice changes nothing.

The import has three outcomes:

- **Found:** import it and set the marker.
- **Nothing there:** set the marker.
- **Couldn't read it:** leave the marker unset and try again next launch. The app still starts, but the record is unavailable. Features that need it wait or retry. Don't fill in a default or change either copy.

If the app record already exists without a marker (for example after a backup restore), keep the app copy and set the marker. It's always the newer one.

### 3. Retire first, delete later

Retiring means the app stops using the native copy but keeps it for recovery. Delete it in a later release, and only for users whose import has run. Some native files hold several records, so never delete a shared file.

### 4. Validate imported data

Native and v3 data is inconsistent: different key names, timestamp units and missing fields. Check it against a schema and clean it up in one place. Store records with a version so their shape can change later. Bad data counts as a failed import (rule 2).

### 5. Files move with their record

If a record points at files, move and check the files before saving the record. Clearing the record deletes its files.

### 6. One owner per record

One TypeScript module reads, writes, clears and imports each record. Nothing else touches it. Each record states which resets clear it.

### 7. Import before anything reads

The import finishes before anything reads or writes the record. The app sees the old state or the new state, never a mix.

### 8. Log the outcome, never the data

Log one line per import: imported, nothing there, already done, or failed (with a reason). Never log the record's contents.

### 9. Test the failure paths

On both platforms, test native data that is missing, partial, corrupt or in v3 format. Also test running twice, a crash at each step, an app record with no marker, a reset then restart, and an upgrade that keeps the user's data.

## Choosing the storage

#4426 picks one storage approach, and the other tickets reuse it. It should answer:

- Is the data private to the app?
- Can it be read when needed, for example before unlock?
- Are writes all-or-nothing, so a crash never leaves half a record?
- What happens on reinstall or backup restore? On iOS, keychain data survives an uninstall.
- Is data kept separate per account and environment?

## What stays native

Device keys, PBKDF2, biometrics, JWT signing, and the account and token records used by native PIN and unlock. The read-only import code also stays until a later cleanup release.

## Checklist

- [ ] One owner module, using the shared storage
- [ ] Imported data validated and versioned
- [ ] Import tells found, nothing there and failed apart
- [ ] Native copy retired, not deleted, before the marker is set
- [ ] Marker versioned, scoped like its record, set only on success or nothing to import
- [ ] Failed import leaves the record unavailable, not empty
- [ ] Files moved and checked before the record is saved
- [ ] Reset behaviour declared and tested
- [ ] Import runs before anything reads the record
- [ ] Outcome logged, without the data
- [ ] Failure paths tested
- [ ] Follow-up ticket to delete the retired native data
