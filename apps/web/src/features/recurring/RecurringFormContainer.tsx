import type { Account, Currency, RecurringFrequencyName } from "@miplata/shared";
import { RECURRING_FREQUENCIES } from "@miplata/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useOnline } from "../../shared/use-online";
import { useResource } from "../../shared/use-resource";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { displayName } from "../accounts/account-display";
import { CategoryPickerContainer } from "../categories/CategoryPickerContainer";
import { currenciesOf, defaultAccountId } from "../movements/movement-form";
import { localDate } from "../movements/present-movement";
import { useLookups } from "../movements/useLookups";
import { RecurringFormScreen } from "./RecurringFormScreen";
import { fetchRecurring, saveRecurring } from "./recurring-api";
import { failureKey } from "./recurring-display";
import {
  applyChange,
  buildRequest,
  emptyForm,
  type FormErrors,
  type FormState,
  formFromRecurring,
} from "./recurring-form";
import "../accounts/screen-note.css";

const ALL_CURRENCIES: Currency[] = ["ARS", "USD"];
const KNOWN_FAILURES = new Set([
  "account_inactive",
  "account_not_allowed",
  "account_not_found",
  "category_inactive",
  "category_not_found",
  "category_type_mismatch",
  "currency_not_in_account",
  "invalid_range",
  "network",
  "recurring_ended",
]);

export function RecurringFormContainer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const online = useOnline();
  const { recurringId } = useParams();
  const isEdit = recurringId !== undefined;
  const lookups = useLookups();
  const loadExisting = useCallback(
    () => (recurringId ? fetchRecurring(recurringId) : Promise.resolve(null)),
    [recurringId],
  );
  const existing = useResource(loadExisting);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || lookups.status !== "ready" || existing.state.status !== "ready") {
      return;
    }
    initialised.current = true;
    if (existing.state.data) {
      setForm(formFromRecurring(existing.state.data));
      return;
    }
    const base = emptyForm(localDate());
    setForm(applyChange(base, { accountId: defaultAccountId(lookups.accounts) }, lookups.accounts));
  }, [lookups.status, lookups.accounts, existing.state]);

  const back = { to: "/recurring", label: t("recurring.form.back") };
  const title = isEdit ? t("recurring.form.editTitle") : t("recurring.form.newTitle");

  if (existing.state.status === "error" || lookups.status === "error") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t(
            existing.state.status === "error" && isEdit
              ? "recurring.form.notFound"
              : "recurring.loadFailed",
          )}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                lookups.reload();
                existing.reload();
              }}
            >
              {t("recurring.retry")}
            </Button>
          }
        />
      </>
    );
  }
  if (!form) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <p className="screen-note" role="status">
          {t("recurring.loading")}
        </p>
      </>
    );
  }

  const accounts: Account[] = lookups.accounts;
  const selected = accounts.find((account) => account.id === form.accountId);
  const accountOptions = [
    { value: "", label: t("recurring.form.choose") },
    ...accounts
      .filter(
        (account) =>
          account.type !== "person" && (account.isActive || account.id === form.accountId),
      )
      .map((account) => ({ value: account.id, label: displayName(account, t) })),
  ];
  const currencies = (selected ? currenciesOf(selected) : ALL_CURRENCIES).map((currency) => ({
    value: currency,
    label: currency,
  }));
  const errorText: Record<string, string> = Object.fromEntries(
    Object.keys(errors).map((key) => [key, t(`recurring.form.errors.${key}`)]),
  );

  function change(patch: Partial<FormState>) {
    setForm((current) => (current ? applyChange(current, patch, accounts) : current));
    setErrors({});
    setFailure(null);
  }

  async function submit() {
    if (!form) {
      return;
    }
    const built = buildRequest(form);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setBusy(true);
    const result = await saveRecurring(recurringId ?? null, built.value);
    setBusy(false);
    if (result.ok) {
      navigate("/recurring");
      return;
    }
    setFailure(
      t(`recurring.form.failures.${failureKey(result.error, KNOWN_FAILURES, "saveFailed")}`),
    );
  }

  return (
    <RecurringFormScreen
      title={title}
      back={back}
      values={form}
      onChange={change}
      errors={errorText}
      accounts={accountOptions}
      currencies={currencies}
      categoryPicker={
        <CategoryPickerContainer
          key={form.type}
          type={form.type}
          value={form.categoryId}
          onChange={(categoryId) => change({ categoryId })}
        />
      }
      categoryError={errors.category ? t("recurring.form.errors.category") : undefined}
      offlineMessage={online ? null : t("offline.saveDisabled")}
      failure={failure}
      busy={busy}
      onSubmit={submit}
      copy={{
        type: t("recurring.form.type"),
        types: { expense: t("movements.types.expense"), income: t("movements.types.income") },
        description: t("recurring.form.description"),
        amountMode: t("recurring.form.amountMode"),
        amountModes: {
          fixed: t("recurring.form.amountModes.fixed"),
          variable: t("recurring.form.amountModes.variable"),
        },
        amount: t("recurring.form.amount"),
        amountHint: t("recurring.form.amountHint"),
        currency: t("recurring.form.currency"),
        account: t("recurring.form.account"),
        frequency: t("recurring.form.frequency"),
        frequencies: RECURRING_FREQUENCIES.map((frequency: RecurringFrequencyName) => ({
          value: frequency,
          label: t(`recurring.frequencies.${frequency}`),
        })),
        day: t("recurring.form.day"),
        dayHint: t("recurring.form.dayHint"),
        startsOn: t("recurring.form.startsOn"),
        endsOn: t("recurring.form.endsOn"),
        submit: isEdit ? t("recurring.form.saveChanges") : t("recurring.form.save"),
        saving: t("recurring.form.saving"),
      }}
    />
  );
}
