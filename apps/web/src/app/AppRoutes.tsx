import { Navigate, Route, Routes } from "react-router-dom";
import { HomeContainer } from "../features/home/HomeContainer";
import { PlaceholderContainer } from "../features/placeholder/PlaceholderContainer";
import { ShellContainer } from "../features/shell/ShellContainer";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ShellContainer />}>
        <Route index element={<HomeContainer />} />
        <Route path="movements" element={<PlaceholderContainer screen="movements" />} />
        <Route path="accounts" element={<PlaceholderContainer screen="accounts" />} />
        <Route path="reports" element={<PlaceholderContainer screen="reports" />} />
      </Route>
      <Route path="sign-in" element={<PlaceholderContainer screen="signIn" />} />
      <Route path="balance" element={<PlaceholderContainer screen="balance" />} />
      <Route path="movements/new" element={<PlaceholderContainer screen="newMovement" />} />
      <Route
        path="accounts/:accountId/statement"
        element={<PlaceholderContainer screen="statement" />}
      />
      <Route
        path="accounts/:accountId/statement/pay"
        element={<PlaceholderContainer screen="payStatement" />}
      />
      <Route path="to-pay" element={<PlaceholderContainer screen="toPay" />} />
      <Route path="menu" element={<PlaceholderContainer screen="menu" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
