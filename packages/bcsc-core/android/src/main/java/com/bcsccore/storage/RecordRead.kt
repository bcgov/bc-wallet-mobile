package com.bcsccore.storage

import android.security.keystore.UserNotAuthenticatedException
import com.bcsccore.fileport.decryption.DecryptionException
import com.google.gson.JsonParseException
import org.json.JSONException

/**
 * Outcome of reading one stored record, behind both its getter and `readLegacyRecord`.
 * [Unreadable.reason] goes to remote logs: fixed codes and exception class names only, never paths, IDs or contents.
 */
internal sealed class RecordRead<out T> {
    data class Ok<out T>(
        val value: T,
    ) : RecordRead<T>()

    /** Any outcome without a value; carries no type, so it can be passed on as another record's result. */
    sealed class Failure : RecordRead<Nothing>()

    object Absent : Failure()

    /** The record may exist, but protected storage can't be read until the user authenticates or unlocks. */
    object Locked : Failure()

    data class Unreadable(
        val reason: String,
    ) : Failure()

    val statusCode: String
        get() =
            when (this) {
                is Ok -> "ok"
                Absent -> "absent"
                Locked -> "locked"
                is Unreadable -> "unreadable"
            }

    companion object {
        const val UNKNOWN_RECORD = "unknown_record"

        /** `code` or `code:ExceptionClass`. */
        fun reason(
            code: String,
            error: Throwable?,
        ): String = error?.let { "$code:${detailOf(it)}" } ?: code

        /** The exception class name, looking through the file-port's [DecryptionException] wrapper. */
        fun detailOf(error: Throwable): String {
            val cause = error.cause
            val meaningful = if (error is DecryptionException && cause != null) cause else error
            return meaningful.javaClass.simpleName
        }

        fun isLockedError(error: Throwable): Boolean =
            generateSequence(error) { it.cause }.take(MAX_CAUSE_DEPTH).any { it is UserNotAuthenticatedException }

        /** A decrypt failure: [Locked] when the keystore wants user authentication, otherwise unreadable. */
        fun decryptFailed(
            record: String,
            error: Throwable,
        ): Failure = if (isLockedError(error)) Locked else Unreadable(reason("${record}_decrypt_failed", error))

        /** An exception the getter rejects or swallows today, classified for `readLegacyRecord`. */
        fun fromException(
            record: String,
            error: Throwable,
        ): Failure {
            if (isLockedError(error)) return Locked
            val code = if (error is JSONException || error is JsonParseException) "parse_failed" else "read_failed"
            return Unreadable(reason("${record}_$code", error))
        }

        private const val MAX_CAUSE_DEPTH = 8
    }
}

internal inline fun <T, R> RecordRead<T>.then(next: (T) -> RecordRead<R>): RecordRead<R> =
    when (this) {
        is RecordRead.Ok -> next(value)
        is RecordRead.Failure -> this
    }

/** Content is passed through as-is, blank included: callers decide what an empty file means. */
internal fun EncryptedFileRead.toRecordRead(record: String): RecordRead<String> =
    when (this) {
        is EncryptedFileRead.Content -> RecordRead.Ok(text)
        EncryptedFileRead.Missing -> RecordRead.Absent
        is EncryptedFileRead.Unreadable -> RecordRead.Unreadable(RecordRead.reason("${record}_file_unreadable", error))
        is EncryptedFileRead.DecryptFailed -> RecordRead.decryptFailed(record, error)
    }

/** Failure for the accounts store, or null when it simply has no accounts. Reuses the getAccountReadStatus codes. */
internal fun AccountsRead.toFailure(): RecordRead.Failure? {
    if (this is AccountsRead.Parsed || this == AccountsRead.FileMissing) return null
    if (this is AccountsRead.DecryptFailed && RecordRead.isLockedError(error)) return RecordRead.Locked
    return RecordRead.Unreadable(detail?.let { "$statusCode:$it" } ?: statusCode)
}
