package ca.bc.gov.id.servicescard.dev

import android.app.Application
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory.getDefaultReactHost
import org.wonday.orientation.OrientationActivityLifecycle

class MainApplication :
    Application(),
    ReactApplication {
    // RN 0.86 is bridgeless-only: ReactNativeHost/DefaultReactNativeHost are gone, and Expo's
    // ReactNativeHostWrapper went with them. ExpoReactHostFactory is the SDK 57 replacement —
    // it applies the ReactNativeHostHandlers contributed by installed Expo modules, which is
    // what the wrapper used to do.
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                },
            // Expo defaults this to ".expo/.virtual-metro-entry"; this app uses a plain RN entry.
            jsMainModulePath = "index",
        )
    }

    override fun onCreate() {
        registerActivityLifecycleCallbacks(OrientationActivityLifecycle.getInstance())
        super.onCreate()
        // Required for expo modules to instantiate properly
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
        loadReactNative(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }
}
