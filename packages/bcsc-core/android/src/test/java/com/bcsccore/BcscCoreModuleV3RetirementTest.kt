package com.bcsccore

import com.bcsccore.storage.NativeCompatibleStorage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

/**
 * Guards the module wiring that stops old v3 data coming back (#4868): deleting the authorization
 * request or the registration token must retire the matching v3 `providers` record, even when no
 * v4 file exists to delete. The storage files are plain JSON, which the storage reads without the keystore.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleV3RetirementTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var module: BcscCoreModule
    private lateinit var storage: NativeCompatibleStorage
    private lateinit var promise: Promise

    private val issuerName = "sit"

    // Must be a valid UUID: with no readable issuer file the storage infers the issuer from UUID-named directories.
    private val accountUuid = "123e4567-e89b-42d3-a456-426614174000"

    @Before
    fun setUp() {
        val context = mockk<ReactApplicationContext>(relaxed = true)
        every { context.filesDir } returns tempFolder.root

        mockkStatic(Arguments::class)
        every { Arguments.createMap() } answers { JavaOnlyMap() }

        File(tempFolder.root, issuerName).mkdirs()
        File(tempFolder.root, "$issuerName/accounts").writeText(
            """[{"uuid":"$accountUuid","issuer":"https://idsit.gov.bc.ca/device/","clientId":"v4-client-id","createdAt":1,"penalty":{"penaltyAttempts":0,"penaltyEndTime":0},"accountSecurityType":"DeviceSecurity"}]""",
        )
        File(tempFolder.root, "$issuerName/$accountUuid").mkdirs()
        File(tempFolder.root, "$issuerName/$accountUuid/providers").writeText(
            """
            {
                "issuer": "https://idsit.gov.bc.ca/device/",
                "clientRegistration": {
                    "client_id": "v3-client-id",
                    "registration_access_token": "v3-registration-token",
                    "authorizationRequest": { "deviceCode": "device-abc" }
                }
            }
            """.trimIndent(),
        )

        promise = mockk(relaxed = true)
        module = BcscCoreModule(context)
        storage = NativeCompatibleStorage(context)
    }

    @After
    fun tearDown() {
        unmockkStatic(Arguments::class)
    }

    @Test
    fun `v3 records are readable before anything is deleted`() {
        assertNotNull(storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid))
        assertEquals("v3-registration-token", storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))
    }

    @Test
    fun `deleteAuthorizationRequest retires the v3 authorization request only`() {
        module.deleteAuthorizationRequest(promise)

        verify { promise.resolve(true) }
        assertNull(storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid))
        assertEquals("v3-registration-token", storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))
    }

    @Test
    fun `deleteToken for the registration token retires the v3 token even with no tokens file`() {
        module.deleteToken(2.0, promise)

        verify { promise.resolve(true) }
        assertNull(storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))
        assertNotNull(storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid))
    }

    @Test
    fun `deleteToken for other token types leaves the v3 token readable`() {
        module.deleteToken(0.0, promise)
        module.deleteToken(1.0, promise)

        assertEquals("v3-registration-token", storage.readRegistrationTokenFromV3Provider(issuerName, accountUuid))
    }
}
