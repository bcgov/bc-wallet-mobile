package com.bcsccore.authentication

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AccountSecurityMethodTest {
    @Test
    fun `fromString maps known values correctly`() {
        assertEquals(
            AccountSecurityMethod.PIN_NO_DEVICE_AUTH,
            AccountSecurityMethod.fromString("app_pin_no_device_authn"),
        )
        assertEquals(
            AccountSecurityMethod.PIN_WITH_DEVICE_AUTH,
            AccountSecurityMethod.fromString("app_pin_has_device_authn"),
        )
        assertEquals(
            AccountSecurityMethod.DEVICE_AUTH,
            AccountSecurityMethod.fromString("device_authentication"),
        )
    }

    @Test
    fun `fromString returns null for unknown value`() {
        assertEquals(null, AccountSecurityMethod.fromString("unknown_method"))
    }

    @Test
    fun `isPIN returns true for PIN methods`() {
        assertTrue(AccountSecurityMethod.PIN_NO_DEVICE_AUTH.isPIN)
        assertTrue(AccountSecurityMethod.PIN_WITH_DEVICE_AUTH.isPIN)
    }

    @Test
    fun `isPIN returns false for DEVICE_AUTH`() {
        assertFalse(AccountSecurityMethod.DEVICE_AUTH.isPIN)
    }

    @Test
    fun `getCurrentPINMethod returns PIN_WITH_DEVICE_AUTH when device auth available`() {
        assertEquals(
            AccountSecurityMethod.PIN_WITH_DEVICE_AUTH,
            AccountSecurityMethod.getCurrentPINMethod(hasDeviceAuth = true),
        )
    }

    @Test
    fun `getCurrentPINMethod returns PIN_NO_DEVICE_AUTH when device auth unavailable`() {
        assertEquals(
            AccountSecurityMethod.PIN_NO_DEVICE_AUTH,
            AccountSecurityMethod.getCurrentPINMethod(hasDeviceAuth = false),
        )
    }

    @Test
    fun `value property matches expected raw strings`() {
        assertEquals("app_pin_no_device_authn", AccountSecurityMethod.PIN_NO_DEVICE_AUTH.value)
        assertEquals("app_pin_has_device_authn", AccountSecurityMethod.PIN_WITH_DEVICE_AUTH.value)
        assertEquals("device_authentication", AccountSecurityMethod.DEVICE_AUTH.value)
    }
}
