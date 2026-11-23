import { Navigate, Route, Routes } from "react-router-dom";
import { AccountFormContainer } from "../features/accounts/AccountFormContainer";
import { AccountsContainer } from "../features/accounts/AccountsContainer";
import { RedirectIfSignedIn } from "../features/auth/RedirectIfSignedIn";
import { RequireAuth } from "../features/auth/RequireAuth";
import { BalanceContainer } from "../features/balance/BalanceContainer";
import { BudgetFormContainer } from "../features/budgets/BudgetFormContainer";
import { BudgetsContainer } from "../features/budgets/BudgetsContainer";
import { CategoriesContainer } from "../features/categories/CategoriesContainer";
import { CategoryEditorContainer } from "../features/categories/CategoryEditorContainer";
import { GroupEditorContainer } from "../features/categories/GroupEditorContainer";
import { HomeContainer } from "../features/home/HomeContainer";
import { LanguageContainer } from "../features/menu/LanguageContainer";
import { MenuContainer } from "../features/menu/MenuContainer";
import { MovementFormContainer } from "../features/movements/MovementFormContainer";
import { MovementsContainer } from "../features/movements/MovementsContainer";
import { LandingContainer } from "../features/public/LandingContainer";
import { LegalContainer } from "../features/public/LegalContainer";
import { PublicLayoutContainer } from "../features/public/PublicLayoutContainer";
import { RecurringFormContainer } from "../features/recurring/RecurringFormContainer";
import { RecurringListContainer } from "../features/recurring/RecurringListContainer";
import { ToPayContainer } from "../features/recurring/ToPayContainer";
import { ReportsContainer } from "../features/reports/ReportsContainer";
import { FocusedLayout } from "../features/shell/FocusedLayout";
import { ShellContainer } from "../features/shell/ShellContainer";
import { ChargeFormContainer } from "../features/statements/ChargeFormContainer";
import { PayStatementContainer } from "../features/statements/PayStatementContainer";
import { ReconcileContainer } from "../features/statements/ReconcileContainer";
import { StatementContainer } from "../features/statements/StatementContainer";
import { GuidesContainer } from "../features/tours/GuidesContainer";

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
          <Route path="reports" element={<ReportsContainer />} />
        </Route>
        <Route element={<FocusedLayout />}>
          <Route path="balance" element={<BalanceContainer />} />
          <Route path="accounts/new" element={<AccountFormContainer />} />
          <Route path="accounts/:accountId/edit" element={<AccountFormContainer />} />
          <Route path="movements/new" element={<MovementFormContainer />} />
          <Route path="movements/:movementId/edit" element={<MovementFormContainer />} />
          <Route path="budgets" element={<BudgetsContainer />} />
          <Route path="budgets/new" element={<BudgetFormContainer />} />
          <Route path="budgets/:budgetId/edit" element={<BudgetFormContainer />} />
          <Route path="categories" element={<CategoriesContainer />} />
          <Route path="categories/new" element={<CategoryEditorContainer mode="new" />} />
          <Route path="categories/groups/new" element={<GroupEditorContainer mode="new" />} />
          <Route path="categories/groups/:groupId" element={<GroupEditorContainer mode="edit" />} />
          <Route path="categories/:categoryId" element={<CategoryEditorContainer mode="edit" />} />
          <Route path="accounts/:accountId/statement" element={<StatementContainer />} />
          <Route path="accounts/:accountId/statement/pay" element={<PayStatementContainer />} />
          <Route path="accounts/:accountId/statement/charge" element={<ChargeFormContainer />} />
          <Route
            path="accounts/:accountId/statement/charges/:movementId"
            element={<ChargeFormContainer />}
          />
          <Route path="accounts/:accountId/statement/reconcile" element={<ReconcileContainer />} />
          <Route path="to-pay" element={<ToPayContainer />} />
          <Route path="recurring" element={<RecurringListContainer />} />
          <Route path="recurring/new" element={<RecurringFormContainer />} />
          <Route path="recurring/:recurringId/edit" element={<RecurringFormContainer />} />
          <Route path="menu" element={<MenuContainer />} />
          <Route path="menu/language" element={<LanguageContainer />} />
          <Route path="guides" element={<GuidesContainer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
