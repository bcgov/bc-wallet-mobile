package com.bcsccore.storage

import android.content.Context
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
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
 * Tests for v3 Provider -> AuthorizationRequest recovery.
 *
 * The 2502 "Token reference was null at point of use" error surfaces when a
 * v3-migrated Account record lacks `issuer` / `clientID` (v3 stored these on
 * Provider/ClientRegistration, not on Account). This test asserts that
 * `readAuthorizationRequestFromV3Provider` surfaces those fields from the
 * v3 Provider blob so the JS hydration layer can backfill the Account.
 */
@RunWith(RobolectricTestRunner::class)
class NativeCompatibleStorageV3ProviderTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var context: Context
    private lateinit var storage: NativeCompatibleStorage

    private val issuerName = "sit"
    private val accountUuid = "test-account-uuid"

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        every { context.filesDir } returns tempFolder.root
        storage = spyk(NativeCompatibleStorage(context), recordPrivateCalls = true)
    }

    /**
     * Create the v3 provider file on disk so File.exists() returns true,
     * and stub readEncryptedFile to return our test JSON without invoking
     * the Android keystore.
     */
    private fun stageProvider(json: String) {
        val accountDir = File(tempFolder.root, issuerName + File.separator + accountUuid)
        accountDir.mkdirs()
        val providerFile = File(accountDir, "providers")
        providerFile.writeText("encrypted-placeholder")

        every { storage.readEncryptedFile(providerFile) } returns json
    }

    @Test
    fun `returns null when provider file does not exist`() {
        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)
        assertNull(result)
    }

    @Test
    fun `extracts issuer and clientID from v3 Provider when authorizationRequest is present`() {
        // Representative v3 Provider blob: nested clientRegistration with client_id
        // and a child authorizationRequest. The issuer can live on either the
        // Provider root or the authorizationRequest depending on v3 version.
        val json =
            """
            {
                "issuer": "https://idsit.gov.bc.ca",
                "clientRegistration": {
                    "client_id": "test-v3-client-id",
                    "authorizationRequest": {
                        "deviceCode": "device-abc",
                        "userCode": "USER-123"
                    }
                }
            }
            """.trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNotNull(result)
        assertEquals("test-v3-client-id", result!!.clientID)
        assertEquals("https://idsit.gov.bc.ca", result.issuer)
        assertEquals("device-abc", result.deviceCode)
        assertEquals("USER-123", result.userCode)
    }

    @Test
    fun `prefers issuer from authorizationRequest over Provider root`() {
        val json =
            """
            {
                "issuer": "https://root.example.com",
                "clientRegistration": {
                    "client_id": "client-xyz",
                    "authorizationRequest": {
                        "issuer": "https://idsit.gov.bc.ca",
                        "deviceCode": "dc"
                    }
                }
            }
            """.trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNotNull(result)
        assertEquals("https://idsit.gov.bc.ca", result!!.issuer)
        assertEquals("client-xyz", result.clientID)
    }

    /**
     * The PR feedback case: with the previous early-return code path the function
     * returned null whenever the nested authorizationRequest was absent, denying
     * callers the chance to recover issuer / clientID. This test asserts the
     * fixed behaviour — a minimal record with issuer + clientID is returned.
     */
    @Test
    fun `returns minimal record with issuer and clientID when authorizationRequest is missing`() {
        val json =
            """
            {
                "issuer": "https://idsit.gov.bc.ca",
                "clientRegistration": {
                    "client_id": "recovered-client-id"
                }
            }
            """.trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNotNull("Expected minimal record so JS layer can backfill Account", result)
        assertEquals("recovered-client-id", result!!.clientID)
        assertEquals("https://idsit.gov.bc.ca", result.issuer)
        // Other fields should be null since the nested authorizationRequest is absent
        assertNull(result.deviceCode)
        assertNull(result.userCode)
    }

    @Test
    fun `returns minimal record when clientRegistration is missing but Provider root has issuer`() {
        val json =
            """
            {
                "issuer": "https://idsit.gov.bc.ca"
            }
            """.trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNotNull(result)
        assertEquals("https://idsit.gov.bc.ca", result!!.issuer)
        assertNull(result.clientID)
    }

    @Test
    fun `returns null when no issuer and no clientID can be recovered`() {
        // No authorizationRequest, no clientRegistration.client_id, no Provider.issuer
        val json = """{ "unrelated": "value" }""".trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNull(result)
    }

    @Test
    fun `falls back to audience as clientID when client_id is missing`() {
        val json =
            """
            {
                "clientRegistration": {
                    "authorizationRequest": {
                        "audience": "audience-as-client-id",
                        "issuer": "https://idsit.gov.bc.ca"
                    }
                }
            }
            """.trimIndent()
        stageProvider(json)

        val result = storage.readAuthorizationRequestFromV3Provider(issuerName, accountUuid)

        assertNotNull(result)
        assertEquals("audience-as-client-id", result!!.clientID)
        assertEquals("https://idsit.gov.bc.ca", result.issuer)
    }
}
