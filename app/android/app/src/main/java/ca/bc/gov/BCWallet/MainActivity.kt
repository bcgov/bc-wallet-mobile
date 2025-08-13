package ca.bc.gov.BCWallet

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.ReactActivity
import org.devio.rn.splashscreen.SplashScreen
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    companion object {
        private const val TAG = "BC_WALLET_TIMING"
    }

    // react-native-screens override
    // https://github.com/software-mansion/react-native-screens#android
    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d(TAG, "onCreate: Starting MainActivity")
        val startTime = System.currentTimeMillis()
        
        Log.d(TAG, "onCreate: Showing splash screen")
        SplashScreen.show(this)
        
        Log.d(TAG, "onCreate: Calling super.onCreate")
        super.onCreate(null)

        val endTime = System.currentTimeMillis()
        Log.d(TAG, "onCreate: Completed in ${endTime - startTime}ms")
    }

    /**
     * Detects changes in device orientation and sends them to JavaScript by broadcasting an event.
     * This is used to support the camera on different tablet orientations.
     */
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val intent = Intent("onConfigurationChanged")
        intent.putExtra("newConfig", newConfig)
        this.sendBroadcast(intent)
    }

    override fun onStart() {
        Log.d(TAG, "onStart: Activity starting")
        super.onStart()
        removeNotifications()
        Log.d(TAG, "onStart: Activity started")
    }


    override fun onResume() {
        Log.d(TAG, "onResume: Activity resuming")
        super.onResume()
        Log.d(TAG, "onResume: Activity resumed")

        // Log React Native bridge state
        val reactInstanceManager = reactNativeHost.reactInstanceManager
        Log.d(TAG, "onResume: ReactInstanceManager state: ${reactInstanceManager.lifecycleState}")
    }

    override fun onRestart() {
        super.onRestart()
        removeNotifications()
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String {
        Log.d(TAG, "getMainComponentName: Returning BCWallet")
        return "BCWallet"
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class
     * [DefaultReactActivityDelegate] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        Log.d(TAG, "createReactActivityDelegate: Creating delegate")
        return object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled
        ) {
            override fun onCreate(savedInstanceState: Bundle?) {
                Log.d(TAG, "ReactActivityDelegate.onCreate: Starting")
                super.onCreate(savedInstanceState)
                Log.d(TAG, "ReactActivityDelegate.onCreate: Completed")
            }
        }
    }

    /**
     * Clears notification badges etc. on app open
     */
    private fun removeNotifications() {
        val notificationManagerCompat = NotificationManagerCompat.from(this)
        notificationManagerCompat.cancelAll()
    }
}