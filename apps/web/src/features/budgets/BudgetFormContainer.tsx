import type { Budget, CategoriesResponse, Currency } from "@miplata/shared";
import { Target } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useOnline } from "../../shared/use-online";
import { useResource } from "../../shared/use-resource";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { pickerSections, useLabel } from "../categories/catalog";
import { useCategories } from "../categories/useCategories";
import { usePickerCopy } from "../categories/usePickerCopy";
import { BudgetFormScreen } from "./BudgetFormScreen";
import {
  type BudgetFormErrors,
  type BudgetFormState,
  buildBudgetRequest,
  CURRENCY_LIST,
  emptyBudgetForm,
  formFromBudget,
  type TargetKind,
} from "./budget-form";
import { createBudget, deleteBudget, fetchBudgets, updateBudget } from "./budgets-api";
import { currentMonth } from "./current-month";
import "../accounts/screen-note.css";

type FormProps = { catalog: CategoriesResponse; budget: Budget | undefined };

function saveFailureKey(error: string): string {
  return error === "budget_exists" ? "budgets.form.exists" : "budgets.form.saveFailed";
}

function BudgetForm({ catalog, budget }: FormProps) {
  const { t } = useTranslation();
  const label = useLabel();
  const pickerCopy = usePickerCopy();
  const navigate = useNavigate();
  const online = useOnline();
  const [form, setForm] = useState<BudgetFormState>(() =>
    budget ? formFromBudget(budget) : emptyBudgetForm(),
  );
  const [errors, setErrors] = useState<BudgetFormErrors | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  function patch(change: Partial<BudgetFormState>) {
    setForm((current) => ({ ...current, ...change }));
  }

  async function submit() {
    setFailure(null);
    const built = buildBudgetRequest(form);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors(null);
    setBusy(true);
    const result = budget
      ? await updateBudget(budget.id, built.value)
      : await createBudget(built.value);
    setBusy(false);
    if (result.ok) {
      navigate("/budgets");
      return;
    }
    setFailure(t(saveFailureKey(result.error)));
  }

  async function remove() {
    if (!budget || removing) {
      return;
    }
    setRemoving(true);
    const result = await deleteBudget(budget.id);
    if (result.ok) {
      navigate("/budgets");
      return;
    }
    setRemoving(false);
    setConfirming(false);
    setManageError(t("budgets.form.deleteFailed"));
  }

  const expenseSections = pickerSections(catalog, "expense", label, form.categoryId);
  const submitLabel = busy
    ? t("budgets.form.saving")
    : budget
      ? t("budgets.form.saveChanges")
      : t("budgets.form.save");

  return (
    <BudgetFormScreen
      title={budget ? t("budgets.form.editTitle") : t("budgets.form.newTitle")}
      back={{ to: "/budgets", label: t("budgets.form.back") }}
      target={{
        label: t("budgets.form.target"),
        kindOptions: [
          { value: "category", label: t("budgets.form.kindCategory") },
          { value: "group", label: t("budgets.form.kindGroup") },
        ],
        kind: form.kind,
        onKindChange: (value) => patch({ kind: value as TargetKind }),
        error: errors?.target ? t(`budgets.form.${errors.target}`) : undefined,
        category: {
          ...pickerCopy,
          sections: expenseSections,
          selectedId: form.categoryId,
          onSelect: (id) => patch({ categoryId: id }),
        },
        groups: {
          label: t("budgets.form.group"),
          options: catalog.expenseGroups.map((group) => ({
            key: group.id,
            label: label(group),
            selected: form.groupId === group.id,
            onSelect: () => patch({ groupId: group.id }),
          })),
        },
      }}
      currency={{
        label: t("budgets.form.currency"),
        options: CURRENCY_LIST.map((currency: Currency) => ({
          key: currency,
          label: currency,
          selected: form.currency === currency,
          onSelect: () => patch({ currency }),
        })),
      }}
      limit={{
        label: `${t("budgets.form.limit")} · ${form.currency}`,
        value: form.limit,
        onChange: (value) => patch({ limit: value }),
        error: errors?.limit ? t(`budgets.form.${errors.limit}`) : undefined,
      }}
      submit={{ label: submitLabel, busy, onSubmit: () => void submit() }}
      offlineMessage={online ? null : t("offline.saveDisabled")}
      errorMessage={failure ?? undefined}
      manage={
        budget
          ? {
              error: manageError ?? undefined,
              remove: {
                label: t("budgets.form.delete"),
                onClick: () => setConfirming(true),
              },
              confirm: confirming
                ? {
                    title: t("budgets.form.confirmDeleteTitle"),
                    body: t("budgets.form.confirmDeleteBody"),
                    confirmLabel: t("budgets.form.confirm"),
                    cancelLabel: t("budgets.form.cancel"),
                    onConfirm: () => void remove(),
                    onCancel: () => setConfirming(false),
                    busy: removing,
                  }
                : undefined,
            }
          : undefined
      }
    />
  );
}

export function BudgetFormContainer() {
  const { t } = useTranslation();
  const { budgetId } = useParams();
  const month = currentMonth();
  const load = useCallback(() => fetchBudgets(month), [month]);
  const budgets = useResource(load);
  const categories = useCategories();
  const back = { to: "/budgets", label: t("budgets.form.back") };
  const title = t("screens.budgets.title");

  if (budgets.state.status === "error" || categories.state.status === "error") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          icon={<Target />}
          title={t("budgets.loadFailed")}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                budgets.reload();
                categories.reload();
              }}
            >
              {t("budgets.retry")}
            </Button>
          }
        />
      </>
    );
  }
  if (budgets.state.status !== "ready" || categories.state.status !== "ready") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <p className="screen-note" role="status">
          {t("budgets.loading")}
        </p>
      </>
    );
  }
  const budget = budgetId
    ? budgets.state.data.items.find((item) => item.id === budgetId)
    : undefined;
  if (budgetId && !budget) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState icon={<Target />} title={t("budgets.form.notFound")} />
      </>
    );
  }
  return <BudgetForm catalog={categories.state.catalog} budget={budget} />;
}
