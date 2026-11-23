import { Navigate, Route, Routes } from "react-router-dom";
import { HomeContainer } from "../features/home/HomeContainer";
import { PlaceholderContainer } from "../features/placeholder/PlaceholderContainer";
import { LandingContainer } from "../features/public/LandingContainer";
import { LegalContainer } from "../features/public/LegalContainer";
import { PublicLayoutContainer } from "../features/public/PublicLayoutContainer";
import { FocusedLayout } from "../features/shell/FocusedLayout";
import { ShellContainer } from "../features/shell/ShellContainer";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayoutContainer />}>
        <Route index element={<LandingContainer />} />
        <Route path="privacy" element={<LegalContainer document="privacy" />} />
        <Route path="terms" element={<LegalContainer document="terms" />} />
      </Route>
      <Route element={<ShellContainer />}>
        <Route path="home" element={<HomeContainer />} />
        <Route path="movements" element={<PlaceholderContainer screen="movements" />} />
        <Route path="accounts" element={<PlaceholderContainer screen="accounts" />} />
        <Route path="reports" element={<PlaceholderContainer screen="reports" />} />
      </Route>
      <Route element={<FocusedLayout />}>
        <Route path="sign-in" element={<PlaceholderContainer screen="signIn" />} />
        <Route path="balance" element={<PlaceholderContainer focused screen="balance" />} />
        <Route
          path="movements/new"
          element={<PlaceholderContainer focused screen="newMovement" />}
        />
        <Route
          path="accounts/:accountId/statement"
          element={<PlaceholderContainer focused screen="statement" />}
        />
        <Route
          path="accounts/:accountId/statement/pay"
          element={<PlaceholderContainer focused screen="payStatement" />}
        />
        <Route path="to-pay" element={<PlaceholderContainer focused screen="toPay" />} />
        <Route path="menu" element={<PlaceholderContainer focused screen="menu" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
