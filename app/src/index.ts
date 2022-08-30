import { translationResources, ConfigurationContext } from "aries-bifold";
import _merge from "lodash.merge";
import { defaultTheme as theme } from "./theme";
import en from "./localization/en";
import { pages } from "./screens/OnboardingPages";
import Terms from "./screens/Terms";
import Splash from "./screens/Splash";
import BCIDView from "./components/BCIDView";
import branding from "./assets/branding/credential-branding";
import UseBiometry from "./screens/UseBiometry";

const localization = _merge({}, translationResources, {
  en: { translation: en },
});
const configuration: ConfigurationContext = {
  pages,
  splash: Splash,
  terms: Terms,
  homeContentView: BCIDView,
  OCABundle: branding,
  useBiometry: UseBiometry,
};

export default { theme, localization, configuration };
