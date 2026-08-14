package com.bcsccore.util

import android.util.Log
import com.facebook.react.bridge.Promise
import java.util.concurrent.atomic.AtomicBoolean

/** Wraps a React Native Promise so it settles at most once; later attempts are logged and ignored. */
class GuardedPromise(
    private val promise: Promise,
) {
    companion object {
        private const val TAG = "GuardedPromise"
    }

    private val settled = AtomicBoolean(false)

    fun resolve(value: Any?) {
        if (settled.compareAndSet(false, true)) {
            promise.resolve(value)
        } else {
            Log.w(TAG, "Ignoring resolve — promise already settled")
        }
    }

    fun reject(
        code: String,
        message: String,
        throwable: Throwable? = null,
    ) {
        if (settled.compareAndSet(false, true)) {
            if (throwable != null) promise.reject(code, message, throwable) else promise.reject(code, message)
        } else {
            Log.w(TAG, "Ignoring reject($code) — promise already settled")
        }
    }
}
