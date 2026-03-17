package com.bcsccore.authentication

import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountTest {
    private fun createAccount(
        id: String = "test-uuid",
        issuer: String = "https://idsit.gov.bc.ca",
        clientID: String = "test-client-id",
        securityMethod: AccountSecurityMethod = AccountSecurityMethod.PIN_NO_DEVICE_AUTH,
    ): Account =
        Account(
            id = id,
            issuer = issuer,
            clientID = clientID,
            securityMethod = securityMethod,
        )

    // MARK: - Initialization

    @Test
    fun `constructor sets all fields correctly`() {
        val account =
            Account(
                id = "abc-123",
                issuer = "https://id.gov.bc.ca",
                clientID = "my-client",
                securityMethod = AccountSecurityMethod.DEVICE_AUTH,
                displayName = "John Doe",
                nickname = "Johnny",
                didPostNicknameToServer = true,
                failedAttemptCount = 3,
                lastAttemptDate = 1000L,
            )

        assertEquals("abc-123", account.id)
        assertEquals("https://id.gov.bc.ca", account.issuer)
        assertEquals("my-client", account.clientID)
        assertEquals(AccountSecurityMethod.DEVICE_AUTH, account.securityMethod)
        assertEquals("John Doe", account.displayName)
        assertEquals("Johnny", account.nickname)
        assertTrue(account.didPostNicknameToServer)
        assertEquals(3, account.failedAttemptCount)
        assertEquals(1000L, account.lastAttemptDate)
    }

    @Test
    fun `constructor uses sensible defaults`() {
        val account = createAccount()

        assertNull(account.displayName)
        assertNull(account.nickname)
        assertFalse(account.didPostNicknameToServer)
        assertEquals(0, account.failedAttemptCount)
        assertNull(account.lastAttemptDate)
    }

    // MARK: - composeSecretID

    @Test
    fun `composeSecretID returns issuer slash accountId`() {
        val result = Account.composeSecretID("https://idsit.gov.bc.ca", "abc-123")
        assertEquals("https://idsit.gov.bc.ca/abc-123", result)
    }

    @Test
    fun `composeSecretID handles empty strings`() {
        val result = Account.composeSecretID("", "")
        assertEquals("/", result)
    }

    // MARK: - displayedNickname

    @Test
    fun `displayedNickname returns nickname when set`() {
        val account = createAccount()
        account.nickname = "Johnny"
        account.displayName = "John Doe"

        assertEquals("Johnny", account.displayedNickname)
    }

    @Test
    fun `displayedNickname falls back to displayName when nickname is null`() {
        val account = createAccount()
        account.nickname = null
        account.displayName = "John Doe"

        assertEquals("John Doe", account.displayedNickname)
    }

    @Test
    fun `displayedNickname falls back to displayName when nickname is empty`() {
        val account = createAccount()
        account.nickname = ""
        account.displayName = "John Doe"

        assertEquals("John Doe", account.displayedNickname)
    }

    @Test
    fun `displayedNickname returns null when both are null`() {
        val account = createAccount()
        account.nickname = null
        account.displayName = null

        assertNull(account.displayedNickname)
    }

    // MARK: - hasNoNicknameAfterUpgradingApp

    @Test
    fun `hasNoNicknameAfterUpgradingApp returns true when nickname is empty and displayName is set`() {
        val account = createAccount()
        account.nickname = null
        account.displayName = "John Doe"

        assertTrue(account.hasNoNicknameAfterUpgradingApp)
    }

    @Test
    fun `hasNoNicknameAfterUpgradingApp returns false when nickname is set`() {
        val account = createAccount()
        account.nickname = "Johnny"
        account.displayName = "John Doe"

        assertFalse(account.hasNoNicknameAfterUpgradingApp)
    }

    @Test
    fun `hasNoNicknameAfterUpgradingApp returns false when both are null`() {
        val account = createAccount()
        account.nickname = null
        account.displayName = null

        assertFalse(account.hasNoNicknameAfterUpgradingApp)
    }

    // MARK: - PIN Penalty Logic

    @Test
    fun `isServingPenalty returns zero for fresh account`() {
        val account = createAccount()
        assertEquals(0L, account.isServingPenalty())
    }

    @Test
    fun `isServingPenalty returns penalty time after 5 failed attempts`() {
        val account = createAccount()
        account.failedAttemptCount = 5
        val now = System.currentTimeMillis()
        account.lastAttemptDate = now

        val penalty = account.isServingPenalty(now)
        // 5 attempts = 1 minute = 60000ms
        assertTrue("Expected penalty > 0 but got $penalty", penalty > 0)
        assertTrue("Expected penalty <= 60000 but got $penalty", penalty <= 60000L)
    }

    @Test
    fun `isServingPenalty returns penalty time after 10 failed attempts`() {
        val account = createAccount()
        account.failedAttemptCount = 10
        val now = System.currentTimeMillis()
        account.lastAttemptDate = now

        val penalty = account.isServingPenalty(now)
        // 10 attempts = 10 minutes = 600000ms
        assertTrue("Expected penalty > 0", penalty > 0)
        assertTrue("Expected penalty <= 600000 but got $penalty", penalty <= 600000L)
    }

    @Test
    fun `isServingPenalty returns penalty time after 15 failed attempts`() {
        val account = createAccount()
        account.failedAttemptCount = 15
        val now = System.currentTimeMillis()
        account.lastAttemptDate = now

        val penalty = account.isServingPenalty(now)
        // 15 attempts = 1 hour = 3600000ms
        assertTrue("Expected penalty > 0", penalty > 0)
        assertTrue("Expected penalty <= 3600000 but got $penalty", penalty <= 3600000L)
    }

    @Test
    fun `isServingPenalty returns penalty time after 20 failed attempts`() {
        val account = createAccount()
        account.failedAttemptCount = 20
        val now = System.currentTimeMillis()
        account.lastAttemptDate = now

        val penalty = account.isServingPenalty(now)
        // 20 attempts = 1 day = 86400000ms
        assertTrue("Expected penalty > 0", penalty > 0)
        assertTrue("Expected penalty <= 86400000 but got $penalty", penalty <= 86400000L)
    }

    @Test
    fun `isServingPenalty returns zero when enough time has passed`() {
        val account = createAccount()
        account.failedAttemptCount = 5
        val pastTime = System.currentTimeMillis() - 120000L // 2 minutes ago
        account.lastAttemptDate = pastTime

        val penalty = account.isServingPenalty()
        assertEquals(0L, penalty)
    }

    @Test
    fun `isServingPenalty returns zero for non-penalty attempt counts`() {
        val account = createAccount()
        account.failedAttemptCount = 3 // Not at a penalty threshold
        val now = System.currentTimeMillis()
        account.lastAttemptDate = now

        val penalty = account.isServingPenalty(now)
        assertEquals(0L, penalty)
    }

    // MARK: - hasPINSetup

    @Test
    fun `hasPINSetup returns true when securityMethod is PIN and service has PIN`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.hasPIN(any()) } returns true

        val account = createAccount(securityMethod = AccountSecurityMethod.PIN_NO_DEVICE_AUTH)
        assertTrue(account.hasPINSetup(mockPinService))
    }

    @Test
    fun `hasPINSetup returns false when securityMethod is DEVICE_AUTH`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.hasPIN(any()) } returns true

        val account = createAccount(securityMethod = AccountSecurityMethod.DEVICE_AUTH)
        assertFalse(account.hasPINSetup(mockPinService))
    }

    @Test
    fun `hasPINSetup returns false when service has no PIN`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.hasPIN(any()) } returns false

        val account = createAccount(securityMethod = AccountSecurityMethod.PIN_NO_DEVICE_AUTH)
        assertFalse(account.hasPINSetup(mockPinService))
    }

    // MARK: - verifyPIN

    @Test
    fun `verifyPIN returns success when PIN is correct`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.validatePIN(any(), "1234") } returns true

        val account = createAccount()
        val result = account.verifyPIN("1234", mockPinService)

        assertTrue(result.success)
        assertFalse(result.locked)
        assertEquals(0, account.failedAttemptCount)
    }

    @Test
    fun `verifyPIN increments failedAttemptCount on wrong PIN`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.validatePIN(any(), "wrong") } returns false

        val account = createAccount()
        account.verifyPIN("wrong", mockPinService)

        assertEquals(1, account.failedAttemptCount)
    }

    @Test
    fun `verifyPIN resets failedAttemptCount on correct PIN`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.validatePIN(any(), "wrong") } returns false
        every { mockPinService.validatePIN(any(), "1234") } returns true

        val account = createAccount()
        // Fail a few times
        account.verifyPIN("wrong", mockPinService)
        account.verifyPIN("wrong", mockPinService)
        assertEquals(2, account.failedAttemptCount)

        // Succeed
        val result = account.verifyPIN("1234", mockPinService)
        assertTrue(result.success)
        assertEquals(0, account.failedAttemptCount)
    }

    @Test
    fun `verifyPIN returns locked when serving penalty`() {
        val mockPinService = mockk<PinService>()
        every { mockPinService.validatePIN(any(), any()) } returns false

        val account = createAccount()
        val now = System.currentTimeMillis()

        // Trigger 5 failed attempts to enter penalty
        for (i in 1..5) {
            account.verifyPIN("wrong", mockPinService, now)
        }

        // Next attempt should be locked
        val result = account.verifyPIN("wrong", mockPinService, now)
        assertTrue("Expected locked but got unlocked", result.locked)
    }
}
