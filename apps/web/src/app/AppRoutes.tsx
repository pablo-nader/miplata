import { Navigate, Route, Routes } from "react-router-dom";
import { AccountFormContainer } from "../features/accounts/AccountFormContainer";
import { AccountsContainer } from "../features/accounts/AccountsContainer";
import { RedirectIfSignedIn } from "../features/auth/RedirectIfSignedIn";
import { RequireAuth } from "../features/auth/RequireAuth";
import { BalanceContainer } from "../features/balance/BalanceContainer";
import { CategoriesContainer } from "../features/categories/CategoriesContainer";
import { CategoryEditorContainer } from "../features/categories/CategoryEditorContainer";
import { GroupEditorContainer } from "../features/categories/GroupEditorContainer";
import { HomeContainer } from "../features/home/HomeContainer";
import { MenuContainer } from "../features/menu/MenuContainer";
import { MovementFormContainer } from "../features/movements/MovementFormContainer";
import { MovementsContainer } from "../features/movements/MovementsContainer";
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
        <Route
          index
          element={
            <RedirectIfSignedIn>
              <LandingContainer />
            </RedirectIfSignedIn>
          }
        />
        <Route path="privacy" element={<LegalContainer document="privacy" />} />
        <Route path="terms" element={<LegalContainer document="terms" />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<ShellContainer />}>
          <Route path="home" element={<HomeContainer />} />
          <Route path="movements" element={<MovementsContainer />} />
          <Route path="accounts" element={<AccountsContainer />} />
          <Route path="reports" element={<PlaceholderContainer screen="reports" />} />
        </Route>
        <Route element={<FocusedLayout />}>
          <Route path="balance" element={<BalanceContainer />} />
          <Route path="accounts/new" element={<AccountFormContainer />} />
          <Route path="accounts/:accountId/edit" element={<AccountFormContainer />} />
          <Route path="movements/new" element={<MovementFormContainer />} />
          <Route path="movements/:movementId/edit" element={<MovementFormContainer />} />
          <Route path="categories" element={<CategoriesContainer />} />
          <Route path="categories/new" element={<CategoryEditorContainer mode="new" />} />
          <Route path="categories/groups/new" element={<GroupEditorContainer mode="new" />} />
          <Route path="categories/groups/:groupId" element={<GroupEditorContainer mode="edit" />} />
          <Route path="categories/:categoryId" element={<CategoryEditorContainer mode="edit" />} />
          <Route
            path="accounts/:accountId/statement"
            element={<PlaceholderContainer focused screen="statement" />}
          />
          <Route
            path="accounts/:accountId/statement/pay"
            element={<PlaceholderContainer focused screen="payStatement" />}
          />
          <Route path="to-pay" element={<PlaceholderContainer focused screen="toPay" />} />
          <Route path="menu" element={<MenuContainer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
