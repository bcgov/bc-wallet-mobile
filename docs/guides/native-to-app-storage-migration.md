# Moving data from native storage to app storage

The pattern to follow when a record that `react-native-bcsc-core` stores natively (in Swift and Kotlin) moves into app storage owned by TypeScript. It covers storage moves only: #4426 and #5009–#5012 under #4341. Other native-to-TypeScript work, such as notifications (#4420), PIN lockout rules (#4423) and the parked JWT tickets, needs its own approach.

In short: **a versioned, one-time import that copies the data, confirms it, and then retires the native copy.** Every step must be safe to run again if the app is killed partway through.

## The rules

### 1. Record that each import has run

Give each record its own migration marker. Never decide to import because the app store is empty.

Name markers with a version (for example `bookmarks.v1`) so a later re-import can run under a new marker. Keep each marker in the same account and environment scope as its record, so a new account or environment never inherits another's migration state.

An empty store can mean "never imported" or "the user cleared it". If the two look the same, the old native data is imported again and deleted state comes back, for example a verification reset being undone on the next launch. Domain resets clear the record, not the marker. Full account removal may clear the marker only after the matching native data has been removed.

### 2. Copy, confirm, retire, then mark complete

Read the native data, validate it, write it to the app store, confirm the write, retire the native copy, and only then set the marker. A crash at any point leaves the app able to run the import again safely, and running it twice changes nothing.

Native import readers must tell three cases apart: the data is present, it is absent, or it couldn't be read. Only success or genuine absence sets the marker. A failed import leaves the marker unset and tries again on the next launch. Code that depends on the record must not treat a failed import as empty, or overwrite anything because of it.

While an import has failed, the app still starts, but the record is unavailable. Only the features that depend on it wait or retry. Don't fill in a default value or write to either copy.

If the app record exists but its marker doesn't (for example after a restore from backup), the app copy wins and the import completes. Nothing writes the native copy after retirement, so the app copy is always the newer one.

### 3. Retire first, delete later

When a record moves, retire the native copy: normal reads and writes move to the new owner, and only a read-only recovery path remains. Delete it in a later release, and only for users whose import has run.

While the retired copy exists, a fix release can still recover data that a buggy import missed. Some native files hold more than one record: never delete a shared file, just stop using the part you moved.

### 4. Validate at the boundary

Native and v3 formats are inconsistent, with mixed key styles, different timestamp units and missing fields. Parse imported data against a schema and normalise it in one place. Store records with a version number so later shape changes can be migrated step by step.

Treat data that can't be read or doesn't validate as a failed import (rule 2). Don't block startup.

### 5. Files move with their record

If a record points at files, make sure every file is in app-owned storage and readable before saving the record, and retire the native copy only once the record and its files are complete. A rerun must reuse or replace files safely, and clearing the record deletes its files too.

### 6. One owner per record

Each record has one TypeScript module that reads, writes, clears and imports it, and nothing else touches its storage. All records share one storage adapter, so the storage choice is made once.

Each record also declares which resets clear it. Not every reset clears everything.

### 7. Import before anything reads

Each import finishes before the record's first reader, once the storage it needs is available. No code reads or writes the record before then. The app sees either the old state or the fully imported state, never a mix.

### 8. Log the outcome, never the data

Log one line per record per import: imported, not present, already done, or failed (with a reason category). That shows when the native readers can be removed. Never log record contents or the raw input that failed validation.

### 9. Test the failure paths

Cover native data that is missing, partial, corrupt, or in the v3 format, on both platforms. Also cover running the import twice, a crash at each step of rule 2, an app record with no marker, a reset followed by a restart, and an upgraded user keeping their data.

## Choosing the storage

The shared storage adapter is chosen once, in #4426, which sets up the app-side store. The other tickets reuse it. It needs clear answers to these questions:

- Is the data kept private to the app?
- Can each record be read when it's needed, for example before the app is unlocked?
- Are writes atomic and durable, so a crash never leaves half a record?
- What happens on reinstall or restore from backup? On iOS, keychain items survive an uninstall, so old records and markers can come back.
- Are records kept apart per account and per environment?

## What stays native

Device keys, PBKDF2, biometrics, JWT signing, and the account and token records that native PIN and unlock code reads. Read-only native import readers also stay until the cleanup release removes them.

## Checklist

- [ ] One owner module for the record, on the shared storage adapter
- [ ] Imported data validated, and stored with a version
- [ ] Native reader tells present, absent and failed apart
- [ ] Native copy retired, not deleted, before the marker is set
- [ ] Migration marker versioned, scoped like its record, and set only on success or when there's nothing to import
- [ ] Failed import leaves the record unavailable, not empty
- [ ] Any files the record points at moved and checked before the record is saved
- [ ] Reset scope declared and tested
- [ ] Import runs before anything reads the record
- [ ] Outcome logged, without the data
- [ ] Failure paths tested
- [ ] Follow-up filed to delete the retired native data and its reader
