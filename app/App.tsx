import {
  Agent,
  AgentProvider,
  AuthProvider,
  toastConfig,
  initStoredLanguage,
  RootStack,
  ErrorModal,
  StoreProvider,
  ThemeProvider,
  ConfigurationProvider,
  initLanguages,
} from "aries-bifold";
import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import SplashScreen from "react-native-splash-screen";
import Toast from "react-native-toast-message";
import _merge from "lodash.merge";
import bcwallet from "./src";
const { theme, localization, configuration } = bcwallet;

initLanguages(localization);
const App = () => {
  const [agent, setAgent] = useState<Agent | undefined>(undefined);
  initStoredLanguage();

  useEffect(() => {
    // Hide the native splash / loading screen so that our
    // RN version can be displayed.
    SplashScreen.hide();
  }, []);

  return (
    <StoreProvider>
      <AgentProvider agent={agent}>
        <ThemeProvider value={theme}>
          <ConfigurationProvider value={configuration}>
            <AuthProvider>
              <StatusBar
                barStyle="light-content"
                hidden={false}
                backgroundColor={theme.ColorPallet.brand.primary}
                translucent={false}
              />
              <ErrorModal />
              <RootStack setAgent={setAgent} />
              <Toast topOffset={15} config={toastConfig} />
            </AuthProvider>
          </ConfigurationProvider>
        </ThemeProvider>
      </AgentProvider>
    </StoreProvider>
  );
};

export default App;


 
 
 
 
 
 
 
 
 
 
