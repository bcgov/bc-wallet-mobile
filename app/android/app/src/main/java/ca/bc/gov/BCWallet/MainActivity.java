package ca.bc.gov.BCWallet;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import androidx.core.app.NotificationManagerCompat;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;

public class MainActivity extends ReactActivity {

  // react-native-screens override
  // https://github.com/software-mansion/react-native-screens#android
  @Override
  protected void onCreate(Bundle savedInstanceState) {
      super.onCreate(null);
  }

  /**
   * Detects changes in device orientation and sends them to JavaScript by broadcasting an event.
   * This is used to support the camera on different tablet orientations.
   */
  @Override
  public void onConfigurationChanged(Configuration newConfig) {
      super.onConfigurationChanged(newConfig);
      Intent intent = new Intent("onConfigurationChanged");
      intent.putExtra("newConfig", newConfig);
      this.sendBroadcast(intent);
  }

  @Override
  protected void onStart() {
    super.onStart();
    removeNotifications();
  }

  @Override
  protected void onRestart() {
    super.onRestart();
    removeNotifications();
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "BCWallet";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }

  /**
   * Clears notification badges etc. on app open
   */
  protected void removeNotifications() {
    NotificationManagerCompat notificationManagerCompat = NotificationManagerCompat.from(this);
    notificationManagerCompat.cancelAll();
  }
}
