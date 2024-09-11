package ca.qc.gouv.portefeuillemobileqc;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import java.io.File;
import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is
   * used to schedule rendering of the component.
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    SplashScreen.show(this);
    super.onCreate(savedInstanceState);
  }

  protected String getMainComponentName() {
    return "PortefeuilleQc";
  }
}
