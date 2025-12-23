package com.bcsccore.authentication

import java.util.*

enum class VerifyPINResult {
    SUCCESS,
    FAILED_WITH_ALERT,
    FAILED_WITH_PENALTY,
}

data class PINVerificationResult(
    val success: Boolean,
    val locked: Boolean,
    val remainingTime: Long,
    val title: String? = null,
    val message: String? = null,
)

data class AccountLockStatus(
    val locked: Boolean,
    val remainingTime: Long,
)

class Account(
    val id: String,
    val issuer: String,
    val clientID: String,
    var securityMethod: AccountSecurityMethod = AccountSecurityMethod.PIN_NO_DEVICE_AUTH,
    var displayName: String? = null,
    var nickname: String? = null,
    var didPostNicknameToServer: Boolean = false,
    var failedAttemptCount: Int = 0,
    var lastAttemptDate: Long? = null,
) {
    companion object {
        private const val DAY = 86400000L // 24 hours in milliseconds
        private const val HOUR = 3600000L // 1 hour in milliseconds
        private const val MINUTE = 60000L // 1 minute in milliseconds
        private const val ATTEMPTS_INCREMENT = 5
        private const val ATTEMPTS_THRESHOLD = 20

        /**
         * Composes a secret ID from issuer and account ID.
         * Matches the format used by native ias-android for PIN storage.
         */
        fun composeSecretID(
            issuer: String,
            accountId: String,
        ): String = "$issuer/$accountId"
    }

    private val penalties =
        mapOf(
            5 to MINUTE,
            10 to 10 * MINUTE,
            15 to HOUR,
            ATTEMPTS_THRESHOLD to DAY,
        )

    val displayedNickname: String?
        get() = nickname?.takeIf { it.isNotEmpty() } ?: displayName?.takeIf { it.isNotEmpty() }

    val hasNoNicknameAfterUpgradingApp: Boolean
        get() = nickname.isNullOrEmpty() && !displayName.isNullOrEmpty()

    fun hasPINSetup(pinService: PinService): Boolean {
        val secretID = composeSecretID(issuer, id)
        return securityMethod.isPIN && pinService.hasPIN(secretID)
    }

    fun verifyPIN(
        pin: String,
        pinService: PinService,
        verifyDate: Long = System.currentTimeMillis(),
    ): PINVerificationResult {
        val remainingPenalty = isServingPenalty(verifyDate)
        if (remainingPenalty > 0) {
            // Serving penalty, return the remaining time
            return PINVerificationResult(
                success = false,
                locked = true,
                remainingTime = remainingPenalty,
            )
        }

        // Update last attempt date
        lastAttemptDate = verifyDate

        val secretID = composeSecretID(issuer, id)
        if (pinService.validatePIN(secretID, pin)) {
            // Verify success - reset failed attempt count
            failedAttemptCount = 0
            return PINVerificationResult(
                success = true,
                locked = false,
                remainingTime = 0,
            )
        }

        // Increment failed attempt count
        failedAttemptCount++

        return getFailedAttemptResult(verifyDate)
    }

    fun verifyPINWithoutPenalty(
        pin: String,
        pinService: PinService,
    ): Boolean {
        val secretID = composeSecretID(issuer, id)
        return pinService.validatePIN(secretID, pin)
    }

    fun isServingPenalty(verifyDate: Long = System.currentTimeMillis()): Long =
        when (val result = getFailedAttemptResult(verifyDate)) {
            is PINVerificationResult -> {
                if (result.locked) result.remainingTime else 0
            }

            else -> {
                0
            }
        }

    private fun getFailedAttemptResult(verifyDate: Long): PINVerificationResult {
        val timeHasPassedSinceLastAttempt = lastAttemptDate?.let { verifyDate - it } ?: 0L

        val penalty = penalties[failedAttemptCount]
        if (penalty != null) {
            val remainingTime = penalty - timeHasPassedSinceLastAttempt
            return PINVerificationResult(
                success = false,
                locked = remainingTime > 0,
                remainingTime = maxOf(0, remainingTime),
            )
        } else if (failedAttemptCount >= ATTEMPTS_THRESHOLD && (failedAttemptCount % ATTEMPTS_INCREMENT) == 0) {
            // Over threshold and has passed all allowed fails in between
            val thresholdPenalty = penalties[ATTEMPTS_THRESHOLD]!!
            val remainingTime = thresholdPenalty - timeHasPassedSinceLastAttempt
            return PINVerificationResult(
                success = false,
                locked = remainingTime > 0,
                remainingTime = maxOf(0, remainingTime),
            )
        } else if ((failedAttemptCount % ATTEMPTS_INCREMENT) <= ATTEMPTS_INCREMENT - 2) {
            // Less than increment - 2
            return PINVerificationResult(
                success = false,
                locked = false,
                remainingTime = 0,
                title = "Incorrect PIN",
                message = "Enter your PIN",
            )
        } else {
            // Less than increment - 1
            return PINVerificationResult(
                success = false,
                locked = false,
                remainingTime = 0,
                title = "Incorrect PIN",
                message =
                    "Enter your PIN. For security, if you enter another incorrect PIN, " +
                        "it will temporarily lock the app.",
            )
        }
    }
}
