import type { Account, Currency } from "@miplata/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useResource } from "../../shared/use-resource";
import { Button } from "../../ui/atoms/Button";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { displayName } from "../accounts/account-display";
import { CategoryPickerContainer } from "../categories/CategoryPickerContainer";
import { MovementFormScreen } from "./MovementFormScreen";
import {
  applyChange,
  buildRequest,
  currenciesOf,
  defaultAccountId,
  emptyForm,
  exchangeRate,
  type FormErrors,
  type FormState,
  formFromMovement,
  INSTALLMENT_CHOICES,
  installmentAmountMinor,
  isCardExpense,
} from "./movement-form";
import { deleteMovement, fetchMovement, saveMovement } from "./movements-api";
import { localDate, statementPathOf } from "./present-movement";
import { useLookups } from "./useLookups";

const ALL_CURRENCIES: Currency[] = ["ARS", "USD"];
const KNOWN_FAILURES = new Set([
  "account_inactive",
  "account_not_allowed",
  "amount_too_small",
  "card_without_schedule",
  "category_inactive",
  "category_type_mismatch",
  "currency_not_in_account",
  "installments_not_allowed",
  "person_share_invalid",
  "statement_movement",
  "transfer_amount_mismatch",
  "transfer_same_account",
]);

export function MovementFormContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const navigate = useNavigate();
  const { movementId } = useParams();
  const isEdit = movementId !== undefined;
  const lookups = useLookups();
  const loadExisting = useCallback(
    () => (movementId ? fetchMovement(movementId) : Promise.resolve(null)),
    [movementId],
  );
  const existing = useResource(loadExisting);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || lookups.status !== "ready" || existing.state.status !== "ready") {
      return;
    }
    initialised.current = true;
    const base = existing.state.data
      ? formFromMovement(existing.state.data)
      : emptyForm(localDate());
    const accountId = base.accountId ?? defaultAccountId(lookups.accounts);
    setForm(existing.state.data ? base : applyChange(base, { accountId }, lookups.accounts));
  }, [lookups.status, lookups.accounts, existing.state]);

  const back = {
    to: isEdit ? "/movements" : "/home",
    label: isEdit ? t("movements.form.backToList") : t("nav.backHome"),
  };
  const title = isEdit ? t("movements.form.editTitle") : t("screens.newMovement.title");

  if (existing.state.status === "error" || lookups.status === "error") {
    const missing = existing.state.status === "error" && isEdit;
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t(missing ? "movements.form.notFound" : "movements.loadFailed")}
          action={
            <Button
              variant="ghost"
              onClick={() => {
                lookups.reload();
                existing.reload();
              }}
            >
              {t("movements.retry")}
            </Button>
          }
        />
      </>
    );
  }
  const statementPath =
    existing.state.status === "ready" && existing.state.data
      ? statementPathOf(existing.state.data)
      : null;
  if (statementPath) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t("movements.form.statementBound.title")}
          description={t("movements.form.statementBound.body")}
          action={
            <Button onClick={() => navigate(statementPath)}>
              {t("movements.form.statementBound.link")}
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
          {t("movements.loading")}
        </p>
      </>
    );
  }

  const accounts: Account[] = lookups.accounts;
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const selected = (id: string | null) => (id ? byId.get(id) : undefined);
  const usable = (account: Account, keep: readonly (string | null)[]) =>
    account.isActive || keep.includes(account.id);
  const option = (account: Account) => ({ value: account.id, label: displayName(account, t) });
  const choose = { value: "", label: t("movements.form.choose") };
  const entryAccount = selected(form.accountId);

  const entryAccounts = [
    choose,
    ...accounts
      .filter((account) => account.type !== "person" && usable(account, [form.accountId]))
      .map(option),
  ];
  const transferAccounts = [
    choose,
    ...accounts
      .filter((account) => usable(account, [form.fromAccountId, form.toAccountId]))
      .map(option),
  ];
  const personOptions = [
    choose,
    ...accounts
      .filter((account) => account.type === "person" && usable(account, [form.personId]))
      .map(option),
  ];

  const perInstallment = installmentAmountMinor(form);
  const installments = isCardExpense(form, entryAccount)
    ? {
        options: [...new Set([...INSTALLMENT_CHOICES, form.installments])]
          .sort((a, b) => a - b)
          .map((count) => ({
            value: String(count),
            label: t("movements.form.installmentsOption", { count }),
          })),
        hint:
          form.installments > 1 && perInstallment !== null
            ? t("movements.form.installmentsHint", {
                count: form.installments,
                amount: formatMoney(perInstallment / 100, form.currency, locale),
              })
            : null,
      }
    : null;

  const rate = exchangeRate(form);
  const rateText =
    rate === null
      ? null
      : t("movements.form.rate", {
          rate: new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(rate),
        });

  const errorText: Record<string, string> = Object.fromEntries(
    Object.keys(errors).map((key) => [key, t(`movements.form.errors.${key}`)]),
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
    const result = await saveMovement(movementId ?? null, built.value);
    setBusy(false);
    if (result.ok) {
      navigate(isEdit ? "/movements" : "/home");
      return;
    }
    setFailure(
      KNOWN_FAILURES.has(result.error)
        ? t(`movements.form.failures.${result.error}`)
        : t("movements.form.saveFailed"),
    );
  }

  async function remove() {
    if (!movementId) {
      return;
    }
    setBusy(true);
    const result = await deleteMovement(movementId);
    setBusy(false);
    setConfirming(false);
    if (result.ok) {
      navigate("/movements");
      return;
    }
    setFailure(t("movements.form.deleteFailed"));
  }

  const submitLabel = isEdit
    ? t("movements.form.saveChanges")
    : t(`movements.form.save.${form.type}`);

  return (
    <MovementFormScreen
      title={title}
      back={back}
      values={form}
      onChange={change}
      errors={errorText}
      entryAccounts={entryAccounts}
      transferAccounts={transferAccounts}
      personOptions={personOptions}
      entryCurrencies={entryAccount ? currenciesOf(entryAccount) : ALL_CURRENCIES}
      fromCurrencies={
        selected(form.fromAccountId) ? currenciesOf(selected(form.fromAccountId)) : ALL_CURRENCIES
      }
      toCurrencies={
        selected(form.toAccountId) ? currenciesOf(selected(form.toAccountId)) : ALL_CURRENCIES
      }
      installments={installments}
      categoryPicker={
        <CategoryPickerContainer
          key={form.type}
          type={form.type === "income" ? "income" : "expense"}
          value={form.categoryId}
          onChange={(categoryId) => change({ categoryId })}
        />
      }
      categoryError={errors.category ? t("movements.form.errors.category") : undefined}
      rateText={rateText}
      failure={failure}
      busy={busy}
      onSubmit={submit}
      copy={{
        typeLabel: t("movements.form.type"),
        types: {
          expense: t("movements.types.expense"),
          income: t("movements.types.income"),
          transfer: t("movements.types.transfer"),
        },
        amount: t("movements.form.amount"),
        currency: t("movements.form.currency"),
        account: t("movements.form.account"),
        installments: t("movements.form.installments"),
        description: t("movements.form.description"),
        date: t("movements.form.date"),
        forOther: t("movements.form.forOther"),
        person: t("movements.form.person"),
        share: t("movements.form.share"),
        from: t("movements.form.from"),
        to: t("movements.form.to"),
        accountFrom: t("movements.form.fromAccount"),
        accountTo: t("movements.form.toAccount"),
        amountFrom: t("movements.form.fromAmount"),
        amountTo: t("movements.form.toAmount"),
        transferNote: t("movements.form.transferNote"),
        submit: submitLabel,
        saving: t("movements.form.saving"),
        ...(isEdit ? { remove: t("movements.form.delete") } : {}),
      }}
      onRemove={isEdit ? () => setConfirming(true) : undefined}
      confirm={
        confirming
          ? {
              title: t("movements.form.confirmDeleteTitle"),
              body: t("movements.form.confirmDeleteBody"),
              confirmLabel: t("accounts.actions.confirm"),
              cancelLabel: t("accounts.actions.cancel"),
              onConfirm: remove,
              onCancel: () => setConfirming(false),
            }
          : undefined
      }
    />
  );
}
