package com.bcsccore

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * A missing account must reject the way iOS does, never resolve a default method: a defaulted
 * value would let callers register or unlock with a security method the user never set up.
 */
@RunWith(RobolectricTestRunner::class)
class BcscCoreModuleSecurityMethodTest {
    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockPromise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)
        // An empty files dir: no native-storage accounts and no legacy accounts file.
        every { mockReactContext.filesDir } returns tempFolder.root
        mockPromise = mockk(relaxed = true)
        module = BcscCoreModule(mockReactContext)
    }

    @Test
    fun `getAccountSecurityMethod rejects with E_ACCOUNT_NOT_FOUND when no account exists`() {
        module.getAccountSecurityMethod(mockPromise)

        verify(exactly = 1) { mockPromise.reject("E_ACCOUNT_NOT_FOUND", "Account not found") }
        verify(exactly = 0) { mockPromise.resolve(any()) }
    }
}
