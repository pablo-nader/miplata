import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { createI18n, type Language } from "../app/i18n";

export function renderInRouter(ui: ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

export function renderApp(ui: ReactElement, language: Language = "es", path = "/") {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}
