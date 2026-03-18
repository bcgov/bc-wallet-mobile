package com.bcsccore

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Verifies that org.json.JSONObject preserves Unicode characters
 * in the same patterns used by getDynamicClientRegistrationBody.
 */
@RunWith(RobolectricTestRunner::class)
class JSONSerializationTest {
    // MARK: - client_name round-trip

    @Test
    fun `client_name preserves Chinese characters`() {
        val nickname = "我的钱包"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("token_endpoint_auth_method", "private_key_jwt")
                put("application_type", "native")
            }

        val jsonString = json.toString()
        assertTrue("JSON string should contain original Chinese characters", jsonString.contains(nickname))

        // Round-trip: parse back and verify
        val parsed = JSONObject(jsonString)
        assertEquals(nickname, parsed.getString("client_name"))
    }

    @Test
    fun `client_name preserves Japanese characters`() {
        val nickname = "私の財布"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("application_type", "native")
            }

        val jsonString = json.toString()
        assertTrue(jsonString.contains(nickname))

        val parsed = JSONObject(jsonString)
        assertEquals(nickname, parsed.getString("client_name"))
    }

    @Test
    fun `client_name preserves Korean characters`() {
        val nickname = "내 지갑"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("application_type", "native")
            }

        val jsonString = json.toString()
        assertTrue(jsonString.contains(nickname))

        val parsed = JSONObject(jsonString)
        assertEquals(nickname, parsed.getString("client_name"))
    }

    @Test
    fun `client_name preserves emoji`() {
        val nickname = "My Wallet 🔐"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("application_type", "native")
            }

        val parsed = JSONObject(json.toString())
        assertEquals(nickname, parsed.getString("client_name"))
    }

    @Test
    fun `client_name preserves mixed scripts`() {
        val nickname = "My钱包Wallet"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("application_type", "native")
            }

        val jsonString = json.toString()
        assertTrue(jsonString.contains(nickname))

        val parsed = JSONObject(jsonString)
        assertEquals(nickname, parsed.getString("client_name"))
    }

    // MARK: - Full DCR body shape

    @Test
    fun `full registration body preserves Unicode client_name`() {
        val nickname = "我的钱包"

        val json =
            JSONObject().apply {
                put("client_name", nickname)
                put("redirect_uris", JSONArray().apply { put("http://localhost:8080/") })
                put("grant_types", JSONArray().apply { put("authorization_code") })
                put("token_endpoint_auth_method", "private_key_jwt")
                put(
                    "jwks",
                    JSONObject().apply {
                        put(
                            "keys",
                            JSONArray().apply {
                                put(
                                    JSONObject().apply {
                                        put("kty", "RSA")
                                        put("e", "AQAB")
                                        put("n", "mock-modulus")
                                        put("kid", "key-1")
                                        put("alg", "RS512")
                                    },
                                )
                            },
                        )
                    },
                )
                put("device_info", "eyJhbGciOiJub25lIn0.eyJkZXZpY2UiOiJ0ZXN0In0.")
                put("application_type", "native")
            }

        val jsonString = json.toString()
        assertTrue("Full DCR body should preserve Chinese client_name", jsonString.contains(nickname))

        // Round-trip
        val parsed = JSONObject(jsonString)
        assertEquals(nickname, parsed.getString("client_name"))
    }
}
