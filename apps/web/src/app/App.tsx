import { I18nextProvider } from "react-i18next";
import { HomeContainer } from "../features/home/HomeContainer";
import { createI18n, detectLanguage, syncDocumentLanguage } from "./i18n";

const language = detectLanguage(navigator.languages);
const i18n = createI18n(language);
syncDocumentLanguage(language);

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HomeContainer />
    </I18nextProvider>
  );
}
