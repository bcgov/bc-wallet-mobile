package com.bcsccore.util

import android.util.Log
import com.facebook.react.bridge.Promise
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

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

    /**
     * Races a resolve against a reject thousands of times, on the same pair of persistent
     * threads, to catch a non-atomic settle guard (e.g. a plain check-then-set instead of
     * [java.util.concurrent.atomic.AtomicBoolean.compareAndSet]) reliably.
     *
     * Blocking coordination (`CountDownLatch`/`await`) was tried first and does not work here:
     * both `park`/`unpark` and OS thread-wake scheduling take microseconds, which is far wider
     * than the few-nanosecond window between "check settled" and "set settled" — by the time a
     * released thread actually runs, the other thread's plain write has almost always already
     * propagated. Empirically this was verified against a deliberately non-atomic
     * [GuardedPromise] (plain `var settled = false` with `if (!settled) { settled = true; ... }`
     * in both `resolve` and `reject`): a latch-based version of this test passed cleanly at 500
     * *and* 20,000 iterations, never once observing the double-settle.
     *
     * Instead, two long-lived threads busy-spin on a shared, plain (non-volatile) `Int`
     * generation counter — no blocking primitive, no `park`/`unpark`, no OS wake latency. Both
     * threads are already actively polling when the main thread bumps the counter, so they act
     * within a handful of CPU cycles of each other and of the counter update becoming visible,
     * which is what actually exercises the interleaving window. The [GuardedPromise] under test
     * and its settle counter are published to the workers by writing them (via [AtomicReference])
     * before the generation bump; per the Java Memory Model, a volatile write of the generation
     * counter after those writes guarantees a worker that observes the new generation also sees
     * the fresh promise and counter (safe publication).
     */
    @Test
    fun `concurrent settle attempts result in exactly one delegate call total across many iterations`() {
        val iterations = 5000
        val timeoutNanos = TimeUnit.SECONDS.toNanos(2)

        val running = AtomicBoolean(true)
        val generation = AtomicInteger(0)
        val doneCount = AtomicInteger(0)
        val guardedRef = AtomicReference<GuardedPromise>()

        fun spinUntilGenerationAdvancesPast(seen: Int): Int {
            var current = generation.get()
            while (current == seen && running.get()) {
                current = generation.get()
            }
            return current
        }

        val resolver =
            Thread({
                var seen = 0
                while (running.get()) {
                    seen = spinUntilGenerationAdvancesPast(seen)
                    if (!running.get()) return@Thread
                    guardedRef.get()?.resolve("from-resolver")
                    doneCount.incrementAndGet()
                }
            }, "GuardedPromiseTest-Resolver")

        val rejecter =
            Thread({
                var seen = 0
                while (running.get()) {
                    seen = spinUntilGenerationAdvancesPast(seen)
                    if (!running.get()) return@Thread
                    guardedRef.get()?.reject("E_CODE", "from-rejecter")
                    doneCount.incrementAndGet()
                }
            }, "GuardedPromiseTest-Rejecter")

        resolver.start()
        rejecter.start()

        try {
            repeat(iterations) { iteration ->
                val iterationPromise = mockk<Promise>(relaxed = true)
                val settleCount = AtomicInteger(0)
                every { iterationPromise.resolve(any()) } answers {
                    settleCount.incrementAndGet()
                    Unit
                }
                every { iterationPromise.reject(any<String>(), any<String>()) } answers {
                    settleCount.incrementAndGet()
                    Unit
                }

                guardedRef.set(GuardedPromise(iterationPromise))
                doneCount.set(0)
                generation.incrementAndGet()

                val deadline = System.nanoTime() + timeoutNanos
                while (doneCount.get() < 2) {
                    if (System.nanoTime() > deadline) {
                        fail("iteration $iteration: resolver/rejecter did not both finish in time")
                    }
                }

                assertEquals(
                    "iteration $iteration: expected exactly one delegate settle call",
                    1,
                    settleCount.get(),
                )
            }
        } finally {
            running.set(false)
            generation.incrementAndGet()
            resolver.join(1_000)
            rejecter.join(1_000)
        }
    }
}
