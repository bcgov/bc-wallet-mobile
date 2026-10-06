package com.bcsccore

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import org.junit.After
import org.junit.Before
import org.junit.Test

class BcscCoreModuleBluetoothTest {
    private lateinit var mockReactContext: ReactApplicationContext
    private lateinit var mockAudioManager: AudioManager
    private lateinit var mockPromise: Promise
    private lateinit var module: BcscCoreModule

    @Before
    fun setUp() {
        mockReactContext = mockk(relaxed = true)
        mockAudioManager = mockk(relaxed = true)
        mockPromise = mockk(relaxed = true)

        every { mockReactContext.getSystemService(Context.AUDIO_SERVICE) } returns mockAudioManager

        mockkStatic(Log::class)
        every { Log.e(any(), any(), any()) } returns 0

        module = BcscCoreModule(mockReactContext)
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
    }

    private fun outputDevices(vararg types: Int) {
        val devices =
            types
                .map { deviceType ->
                    mockk<AudioDeviceInfo>().also { every { it.type } returns deviceType }
                }.toTypedArray()
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns devices
    }

    // MARK: - Bluetooth detected

    @Test
    fun `resolves true when a Bluetooth SCO headset is connected`() {
        outputDevices(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, AudioDeviceInfo.TYPE_BLUETOOTH_SCO)

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(true) }
    }

    @Test
    fun `resolves true when a Bluetooth A2DP device is connected`() {
        outputDevices(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(true) }
    }

    // MARK: - No Bluetooth

    @Test
    fun `resolves false when only built-in and wired outputs are connected`() {
        outputDevices(
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE,
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
        )

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false when there are no output devices`() {
        outputDevices()

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    // MARK: - Edge cases

    @Test
    fun `resolves false when AudioManager is unavailable`() {
        every { mockReactContext.getSystemService(Context.AUDIO_SERVICE) } returns null

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(false) }
    }

    @Test
    fun `resolves false instead of rejecting when listing devices throws`() {
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } throws
            RuntimeException("service unavailable")

        module.isBluetoothAudioConnected(mockPromise)

        verify { mockPromise.resolve(false) }
        verify(exactly = 0) { mockPromise.reject(any<String>(), any<String>(), any<Throwable>()) }
    }
}
