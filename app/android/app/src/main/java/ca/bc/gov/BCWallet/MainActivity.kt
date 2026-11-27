package ca.bc.gov.id.servicescard.dev

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.ReactActivity
import org.devio.rn.splashscreen.SplashScreen
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {
    // react-native-screens override
    // https://github.com/software-mansion/react-native-screens#android
    override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(savedInstanceState)
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

    override fun getMainComponentName(): String = "BCWallet"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(
            this,
            mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
        )

    /**
     * Clears notification badges etc. on app open
     */
    private fun removeNotifications() {
        val notificationManagerCompat = NotificationManagerCompat.from(this)
        notificationManagerCompat.cancelAll()
    }
}
