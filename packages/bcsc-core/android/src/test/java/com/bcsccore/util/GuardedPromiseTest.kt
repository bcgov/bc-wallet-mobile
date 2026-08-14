package com.bcsccore.util

import android.util.Log
import com.facebook.react.bridge.Promise
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.assertEquals

class GuardedPromiseTest {
    private lateinit var mockPromise: Promise

    @Before
    fun setUp() {
        mockPromise = mockk(relaxed = true)

        mockkStatic(Log::class)
        every { Log.w(any(), any<String>()) } returns 0
    }

    @After
    fun tearDown() {
        unmockkStatic(Log::class)
    }

    @Test
    fun `resolve then resolve calls delegate resolve exactly once`() {
        val guarded = GuardedPromise(mockPromise)

        guarded.resolve("first")
        guarded.resolve("second")

        verify(exactly = 1) { mockPromise.resolve("first") }
        verify(exactly = 0) { mockPromise.resolve("second") }
    }

    @Test
    fun `resolve then reject never calls delegate reject`() {
        val guarded = GuardedPromise(mockPromise)

        guarded.resolve("value")
        guarded.reject("E_CODE", "message")

        verify(exactly = 1) { mockPromise.resolve("value") }
        verify(exactly = 0) { mockPromise.reject(any<String>(), any<String>()) }
    }

    @Test
    fun `reject then resolve never calls delegate resolve`() {
        val guarded = GuardedPromise(mockPromise)

        guarded.reject("E_CODE", "message")
        guarded.resolve("value")

        verify(exactly = 1) { mockPromise.reject("E_CODE", "message") }
        verify(exactly = 0) { mockPromise.resolve(any()) }
    }

    @Test
    fun `reject without throwable invokes two-arg overload`() {
        val guarded = GuardedPromise(mockPromise)

        guarded.reject("E_CODE", "message")

        verify(exactly = 1) { mockPromise.reject("E_CODE", "message") }
    }

    @Test
    fun `reject with throwable invokes three-arg overload`() {
        val guarded = GuardedPromise(mockPromise)
        val throwable = RuntimeException("boom")

        guarded.reject("E_CODE", "message", throwable)

        verify(exactly = 1) { mockPromise.reject("E_CODE", "message", throwable) }
    }

    @Test
    fun `concurrent settle attempts result in exactly one delegate call total`() {
        val guarded = GuardedPromise(mockPromise)
        val settleCount = AtomicInteger(0)
        every { mockPromise.resolve(any()) } answers {
            settleCount.incrementAndGet()
            Unit
        }
        every { mockPromise.reject(any<String>(), any<String>()) } answers {
            settleCount.incrementAndGet()
            Unit
        }

        val readyLatch = CountDownLatch(2)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(2)
        val executor = Executors.newFixedThreadPool(2)

        executor.execute {
            readyLatch.countDown()
            startLatch.await()
            guarded.resolve("from-thread-1")
            doneLatch.countDown()
        }

        executor.execute {
            readyLatch.countDown()
            startLatch.await()
            guarded.reject("E_CODE", "from-thread-2")
            doneLatch.countDown()
        }

        readyLatch.await()
        startLatch.countDown()
        doneLatch.await(5, TimeUnit.SECONDS)
        executor.shutdown()

        assertEquals(1, settleCount.get())
    }
}
