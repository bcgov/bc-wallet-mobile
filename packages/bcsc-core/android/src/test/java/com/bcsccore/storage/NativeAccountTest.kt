package com.bcsccore.storage

import com.google.gson.GsonBuilder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class NativeAccountTest {
    private val gson =
        GsonBuilder()
            .create()

    @Test
    fun `NativeAccount serializes to expected JSON fields`() {
        val account =
            NativeAccount(
                uuid = "abc-123",
                issuer = "https://idsit.gov.bc.ca",
                clientId = "client-456",
                nickName = "Johnny",
                accountSecurityType = NativeAccountSecurityType.PinNoDeviceAuth,
                createdAt = 1700000000000L,
            )

        val json = gson.toJson(account)
        assertNotNull(json)

        // Verify field names match native ias-android format
        val parsed = gson.fromJson(json, Map::class.java)
        assertEquals("abc-123", parsed["uuid"])
        assertEquals("https://idsit.gov.bc.ca", parsed["issuer"])
        assertEquals("client-456", parsed["clientId"])
        assertEquals("Johnny", parsed["nickName"])
    }

    @Test
    fun `NativeAccount deserializes from JSON correctly`() {
        val json =
            """
            {
                "uuid": "abc-123",
                "issuer": "https://id.gov.bc.ca",
                "clientId": "client-456",
                "nickName": "Test User",
                "createdAt": 1700000000000,
                "penalty": { "penaltyAttempts": 3, "penaltyEndTime": 0 },
                "accountSecurityType": "DeviceSecurity"
            }
            """.trimIndent()

        val account = gson.fromJson(json, NativeAccount::class.java)

        assertEquals("abc-123", account.uuid)
        assertEquals("https://id.gov.bc.ca", account.issuer)
        assertEquals("client-456", account.clientId)
        assertEquals("Test User", account.nickName)
        assertEquals(1700000000000L, account.createdAt)
        assertEquals(3, account.penalty.penaltyAttempts)
        assertEquals(NativeAccountSecurityType.DeviceSecurity, account.accountSecurityType)
    }

    @Test
    fun `NativeAccount defaults are correct`() {
        val account =
            NativeAccount(
                uuid = "test-id",
                issuer = "https://id.gov.bc.ca",
                clientId = "client-id",
            )

        assertNull(account.nickName)
        assertEquals(NativeAccountSecurityType.DeviceSecurity, account.accountSecurityType)
        assertEquals(0, account.penalty.penaltyAttempts)
        assertEquals(0L, account.penalty.penaltyEndTime)
    }

    @Test
    fun `NativeAccount round-trips through Gson`() {
        val original =
            NativeAccount(
                uuid = "round-trip-id",
                issuer = "https://idsit.gov.bc.ca",
                clientId = "rt-client",
                nickName = "RoundTrip",
                accountSecurityType = NativeAccountSecurityType.PinWithDeviceAuth,
                createdAt = 1700000000000L,
                penalty = NativePenalty(penaltyAttempts = 5, penaltyEndTime = 9999L),
            )

        val json = gson.toJson(original)
        val restored = gson.fromJson(json, NativeAccount::class.java)

        assertEquals(original.uuid, restored.uuid)
        assertEquals(original.issuer, restored.issuer)
        assertEquals(original.clientId, restored.clientId)
        assertEquals(original.nickName, restored.nickName)
        assertEquals(original.accountSecurityType, restored.accountSecurityType)
        assertEquals(original.createdAt, restored.createdAt)
        assertEquals(original.penalty.penaltyAttempts, restored.penalty.penaltyAttempts)
        assertEquals(original.penalty.penaltyEndTime, restored.penalty.penaltyEndTime)
    }

    @Test
    fun `NativeAccountSecurityType deserializes alternate names`() {
        // Verify that the @SerializedName alternate values work
        val json = """{"uuid":"id","issuer":"i","clientId":"c","accountSecurityType":"DeviceSecurity"}"""
        val account = gson.fromJson(json, NativeAccount::class.java)
        assertEquals(NativeAccountSecurityType.DeviceSecurity, account.accountSecurityType)

        val json2 = """{"uuid":"id","issuer":"i","clientId":"c","accountSecurityType":"PinNoDeviceAuth"}"""
        val account2 = gson.fromJson(json2, NativeAccount::class.java)
        assertEquals(NativeAccountSecurityType.PinNoDeviceAuth, account2.accountSecurityType)

        val json3 = """{"uuid":"id","issuer":"i","clientId":"c","accountSecurityType":"PinWithDeviceAuth"}"""
        val account3 = gson.fromJson(json3, NativeAccount::class.java)
        assertEquals(NativeAccountSecurityType.PinWithDeviceAuth, account3.accountSecurityType)
    }

    @Test
    fun `NativePenalty defaults are zero`() {
        val penalty = NativePenalty()
        assertEquals(0, penalty.penaltyAttempts)
        assertEquals(0L, penalty.penaltyEndTime)
    }
}
