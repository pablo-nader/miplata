import { I18nextProvider } from "react-i18next";
import { HomeContainer } from "../features/home/HomeContainer";
import { createI18n, detectLanguage } from "./i18n";

const i18n = createI18n(detectLanguage(navigator.languages));

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HomeContainer />
    </I18nextProvider>
  );
}
