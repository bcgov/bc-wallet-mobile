package ca.qc.gouv.portefeuillemobileqc;
import android.os.Bundle;
import com.facebook.react.ReactActivity;
import java.io.File;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is
   * used to schedule rendering of the component.
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }

  protected String getMainComponentName() { return "PortefeuilleQc"; }
}
