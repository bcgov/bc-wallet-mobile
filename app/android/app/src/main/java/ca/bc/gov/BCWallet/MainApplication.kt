package ca.bc.gov.id.servicescard.dev

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import org.wonday.orientation.OrientationActivityLifecycle

class MainApplication :
    Application(),
    ReactApplication {
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                },
            jsMainModulePath = "index",
        )
    }

    override fun onCreate() {
        registerActivityLifecycleCallbacks(OrientationActivityLifecycle.getInstance())
        super.onCreate()
        loadReactNative(this)
    }
}
