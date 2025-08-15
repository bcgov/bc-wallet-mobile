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

    // react-native-screens override
    // https://github.com/software-mansion/react-native-screens#android
    override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)
        super.onCreate(null)
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
        super.onStart()
        removeNotifications()
    }

    override fun onRestart() {
        super.onRestart()
        removeNotifications()
    }

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "BCWallet"

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class
     * [DefaultReactActivityDelegate] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled
        ) {
            override fun onCreate(savedInstanceState: Bundle?) {
                super.onCreate(savedInstanceState)
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