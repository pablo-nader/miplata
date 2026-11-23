import {
  type Currency,
  categoryLabel,
  FINANCIAL_CHARGES_GROUP_KEY,
  type StatementDetail,
} from "@miplata/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { useCategories } from "../categories/useCategories";
import { ChargeFormScreen } from "./ChargeFormScreen";
import { buildCharge, type ChargeForm, chargeFormFrom, emptyChargeForm } from "./statement-forms";
import { addCharge, editCharge, removeCharge } from "./statements-api";
import { useStatementData } from "./useStatementData";

const KNOWN_FAILURES = new Set([
  "account_inactive",
  "category_inactive",
  "category_not_allowed",
  "category_not_found",
  "currency_not_in_account",
]);

export function ChargeFormContainer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountId = "", movementId } = useParams();
  const [search] = useSearchParams();
  const period = search.get("period");
  const data = useStatementData(accountId, period);
  const categories = useCategories();
  const [form, setForm] = useState<ChargeForm | null>(null);
  const [errors, setErrors] = useState<Record<string, true>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const initialised = useRef(false);
  const isEdit = movementId !== undefined;

  const statementPath = `/accounts/${accountId}/statement${period ? `?period=${period}` : ""}`;
  const back = { to: statementPath, label: t("statements.charge.back") };
  const title = t(isEdit ? "statements.charge.editTitle" : "statements.charge.newTitle");
  const existing = data.detail?.charges.find((line) => line.movementId === movementId);

  useEffect(() => {
    if (initialised.current || data.status !== "ready" || !data.detail) {
      return;
    }
    if (isEdit && !existing) {
      return;
    }
    initialised.current = true;
    const firstCurrency = data.card?.currencies[0]?.currency ?? "ARS";
    setForm(
      existing ? chargeFormFrom(existing) : emptyChargeForm(data.detail.closingDate, firstCurrency),
    );
  }, [data.status, data.detail, data.card, existing, isEdit]);

  const failed = data.status === "error" || categories.state.status === "error";
  if (failed || (data.status === "ready" && isEdit && !existing)) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t(failed ? "statements.loadFailed" : "statements.charge.notFound")}
          action={
            failed ? (
              <Button
                variant="ghost"
                onClick={() => {
                  data.reload();
                  categories.reload();
                }}
              >
                {t("statements.retry")}
              </Button>
            ) : undefined
          }
        />
      </>
    );
  }
  if (!form || !data.detail || categories.state.status !== "ready") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <p className="screen-note" role="status">
          {t("statements.loading")}
        </p>
      </>
    );
  }

  const detail: StatementDetail = data.detail;
  const group = categories.state.catalog.expenseGroups.find(
    (item) => item.nameKey === FINANCIAL_CHARGES_GROUP_KEY,
  );
  const options = [
    { value: "", label: t("statements.charge.choose") },
    ...(group?.categories ?? [])
      .filter((item) => item.isActive || item.id === form.categoryId)
      .map((item) => ({ value: item.id, label: categoryLabel(item, (key) => t(key)) })),
  ];
  const currencies: Currency[] = data.card?.currencies.map((entry) => entry.currency) ?? ["ARS"];

  function change(patch: Partial<ChargeForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setErrors({});
    setFailure(null);
  }

  function failureText(error: string): string {
    return KNOWN_FAILURES.has(error)
      ? t(`statements.failures.${error}`)
      : t("statements.failures.saveFailed");
  }

  async function submit() {
    if (!form) {
      return;
    }
    const built = buildCharge(form);
    if (!built.ok) {
      setErrors(built.errors as Record<string, true>);
      return;
    }
    setBusy(true);
    const result = movementId
      ? await editCharge(detail.id, movementId, built.value)
      : await addCharge(detail.id, built.value);
    setBusy(false);
    if (result.ok) {
      navigate(statementPath);
      return;
    }
    setFailure(failureText(result.error));
  }

  async function remove() {
    if (!movementId) {
      return;
    }
    setBusy(true);
    const result = await removeCharge(detail.id, movementId);
    setBusy(false);
    setConfirming(false);
    if (result.ok) {
      navigate(statementPath);
      return;
    }
    setFailure(failureText(result.error));
  }

  return (
    <ChargeFormScreen
      title={title}
      back={back}
      category={{
        label: t("statements.charge.category"),
        value: form.categoryId ?? "",
        options,
        error: errors.category ? t("statements.charge.errors.category") : undefined,
        onChange: (value) => change({ categoryId: value || null }),
      }}
      currency={{
        label: t("statements.charge.currency"),
        options: currencies.map((currency) => ({ value: currency, label: currency })),
        value: form.currency,
        onChange: (value) => change({ currency: value as Currency }),
      }}
      amount={{
        label: t("statements.charge.amount"),
        value: form.amount,
        error: errors.amount ? t("statements.charge.errors.amount") : undefined,
        onChange: (value) => change({ amount: value }),
      }}
      description={{
        label: t("statements.charge.description"),
        value: form.description,
        onChange: (value) => change({ description: value }),
      }}
      date={{
        label: t("statements.charge.date"),
        value: form.date,
        error: errors.date ? t("statements.charge.errors.date") : undefined,
        onChange: (value) => change({ date: value }),
      }}
      hint={t("statements.charge.hint")}
      failure={failure}
      submit={{
        label: busy
          ? t("statements.charge.saving")
          : t(isEdit ? "statements.charge.saveChanges" : "statements.charge.save"),
        busy,
        onSubmit: submit,
      }}
      remove={
        isEdit
          ? {
              label: t("statements.charge.delete"),
              onRemove: () => setConfirming(true),
              confirm: confirming
                ? {
                    title: t("statements.charge.confirmDeleteTitle"),
                    body: t("statements.charge.confirmDeleteBody"),
                    confirmLabel: t("accounts.actions.confirm"),
                    cancelLabel: t("accounts.actions.cancel"),
                    onConfirm: remove,
                    onCancel: () => setConfirming(false),
                  }
                : null,
            }
          : undefined
      }
    />
  );
}
