import type { Account, AccountType, Currency, Institution } from "@miplata/shared";
import { Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useResource } from "../../shared/use-resource";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { AccountFormScreen } from "./AccountFormScreen";
import { displayName } from "./account-display";
import {
  buildCreate,
  buildUpdate,
  type CreateSubmission,
  CURRENCY_LIST,
  emptyForm,
  type FormErrors,
  type FormState,
  formFromAccount,
  INSTITUTION_TYPES,
  institutionsFor,
  type UpdateSubmission,
} from "./account-form";
import "./screen-note.css";
import {
  type AccountKind,
  createAccount,
  deleteAccount,
  fetchAccounts,
  fetchInstitutions,
  type MutationResult,
  setAccountActive,
  updateAccount,
} from "./accounts-api";

const ACCOUNT_TYPES: readonly AccountType[] = ["bank", "wallet", "cash", "credit_card", "person"];

type FormData = { institutions: Institution[]; accounts: Account[] };

async function loadFormData(): Promise<FormData> {
  const [institutions, accounts] = await Promise.all([fetchInstitutions(), fetchAccounts()]);
  return { institutions, accounts };
}

export function AccountFormContainer() {
  const { t } = useTranslation();
  const { accountId } = useParams();
  const { state, reload } = useResource(loadFormData);
  const back = { to: "/accounts", label: t("accounts.form.back") };

  if (state.status !== "ready") {
    return (
      <>
        <ScreenHeader title={t("screens.accounts.title")} back={back} />
        {state.status === "loading" ? (
          <p className="screen-note" role="status">
            {t("accounts.loading")}
          </p>
        ) : (
          <EmptyState
            icon={<Wallet />}
            title={t("accounts.loadFailed")}
            action={
              <Button variant="ghost" onClick={reload}>
                {t("accounts.retry")}
              </Button>
            }
          />
        )}
      </>
    );
  }

  const account = accountId ? state.data.accounts.find((item) => item.id === accountId) : undefined;
  if (accountId && !account) {
    return (
      <>
        <ScreenHeader title={t("screens.accounts.title")} back={back} />
        <EmptyState icon={<Wallet />} title={t("accounts.form.notFound")} />
      </>
    );
  }
  return <AccountForm institutions={state.data.institutions} account={account} />;
}

type AccountFormProps = { institutions: Institution[]; account: Account | undefined };

function errorKey(error: string): string {
  return error === "currency_in_use" ? "accounts.form.currencyInUse" : "accounts.form.saveFailed";
}

function AccountForm({ institutions, account }: AccountFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const original = account ? { account, displayName: displayName(account, t) } : null;
  const [form, setForm] = useState<FormState>(() =>
    account ? formFromAccount(account, displayName(account, t)) : emptyForm(),
  );
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState<"deactivate" | "delete" | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const kind: AccountKind = form.type === "person" ? "person" : "account";
  const catalog = institutionsFor(form.type, institutions);

  function patch(change: Partial<FormState>) {
    setForm((current) => ({ ...current, ...change }));
  }

  function selectType(type: AccountType) {
    patch({ ...emptyForm(type), name: form.name, currencies: form.currencies });
  }

  function selectInstitution(institution: Institution | null) {
    const previous = institutions.find((item) => item.id === form.institutionId);
    const followsPrevious = form.name === "" || form.name === previous?.name;
    patch({
      institutionId: institution?.id ?? null,
      ...(followsPrevious ? { name: institution?.name ?? "" } : {}),
    });
  }

  function setCurrency(currency: Currency, change: Partial<FormState["currencies"][Currency]>) {
    setForm((current) => ({
      ...current,
      currencies: {
        ...current.currencies,
        [currency]: { ...current.currencies[currency], ...change },
      },
    }));
  }

  async function submit() {
    setFailure(null);
    const built = original
      ? buildUpdate(form, institutions, original)
      : buildCreate(form, institutions);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setErrors(null);
    setBusy(true);
    const result: MutationResult<Account> = original
      ? await updateAccount(original.account.id, built.value as UpdateSubmission)
      : await createAccount(built.value as CreateSubmission);
    setBusy(false);
    if (result.ok) {
      navigate("/accounts");
      return;
    }
    setFailure(t(errorKey(result.error)));
  }

  async function confirm() {
    if (!account || !pending || confirming) {
      return;
    }
    setConfirming(true);
    const result =
      pending === "delete"
        ? await deleteAccount(kind, account.id)
        : await setAccountActive(kind, account.id, false);
    if (result.ok) {
      navigate("/accounts");
      return;
    }
    setConfirming(false);
    setPending(null);
    setManageError(
      result.error === "account_in_use"
        ? t("accounts.actions.inUse")
        : t("accounts.actions.failed"),
    );
  }

  async function reactivate() {
    if (!account) {
      return;
    }
    const result = await setAccountActive(kind, account.id, true);
    if (result.ok) {
      navigate("/accounts");
      return;
    }
    setManageError(t("accounts.actions.failed"));
  }

  const showInstitutions = INSTITUTION_TYPES.includes(form.type);
  const amountLabel =
    form.type === "credit_card"
      ? t("accounts.form.openingDebt")
      : form.type === "person"
        ? t("accounts.form.openingPerson")
        : t("accounts.form.openingBalance");
  const name = account ? displayName(account, t) : "";

  return (
    <AccountFormScreen
      title={account ? t("accounts.form.editTitle") : t("accounts.form.newTitle")}
      back={{ to: "/accounts", label: t("accounts.form.back") }}
      types={
        account
          ? undefined
          : {
              label: t("accounts.form.type"),
              options: ACCOUNT_TYPES.map((type) => ({
                key: type,
                label: t(`accounts.types.${type}`),
                selected: form.type === type,
                onSelect: () => selectType(type),
              })),
            }
      }
      institutions={
        showInstitutions
          ? {
              label: t("accounts.form.institution"),
              options: [
                ...catalog.map((institution) => ({
                  key: institution.id,
                  label: institution.name,
                  selected: form.institutionId === institution.id,
                  onSelect: () => selectInstitution(institution),
                })),
                {
                  key: "other",
                  label: t("accounts.form.otherInstitution"),
                  selected: form.institutionId === null,
                  onSelect: () => selectInstitution(null),
                },
              ],
            }
          : undefined
      }
      name={{
        label: form.institutionId ? t("accounts.form.nameOptional") : t("accounts.form.name"),
        value: form.name,
        onChange: (value) => patch({ name: value }),
        error: errors?.name ? t(`accounts.form.${errors.name}`) : undefined,
      }}
      currencies={{
        label: t("accounts.form.currencies"),
        error: errors?.currencies ? t("accounts.form.currencyRequired") : undefined,
        rows: CURRENCY_LIST.map((currency) => ({
          key: currency,
          label: t(`accounts.currencyNames.${currency}`),
          enabled: form.currencies[currency].enabled,
          onToggle: (enabled) => setCurrency(currency, { enabled }),
          amount: {
            label: `${amountLabel} · ${currency}`,
            value: form.currencies[currency].amount,
            onChange: (value) => setCurrency(currency, { amount: value }),
            error: errors?.amounts[currency] ? t("accounts.form.amountInvalid") : undefined,
          },
        })),
      }}
      personHint={form.type === "person" ? t("accounts.form.personHint") : undefined}
      cardDays={
        form.type === "credit_card"
          ? {
              closing: {
                label: t("accounts.form.closingDay"),
                value: form.closingDay,
                onChange: (value) => patch({ closingDay: value }),
                error: errors?.closingDay ? t("accounts.form.dayInvalid") : undefined,
              },
              due: {
                label: t("accounts.form.dueDay"),
                value: form.dueDay,
                onChange: (value) => patch({ dueDay: value }),
                error: errors?.dueDay ? t("accounts.form.dayInvalid") : undefined,
              },
            }
          : undefined
      }
      submit={{
        label: busy
          ? t("accounts.form.saving")
          : account
            ? t("accounts.form.saveChanges")
            : t("accounts.form.save"),
        busy,
        onSubmit: () => void submit(),
      }}
      errorMessage={failure ?? undefined}
      manage={
        account
          ? {
              hint: account.canDelete ? undefined : t("accounts.actions.hasMovements"),
              error: manageError ?? undefined,
              toggle: account.isActive
                ? {
                    label: t("accounts.actions.deactivate"),
                    onClick: () => setPending("deactivate"),
                  }
                : { label: t("accounts.actions.reactivate"), onClick: () => void reactivate() },
              remove: account.canDelete
                ? { label: t("accounts.actions.delete"), onClick: () => setPending("delete") }
                : undefined,
              confirm: pending
                ? {
                    title:
                      pending === "delete"
                        ? t("accounts.actions.confirmDeleteTitle", { name })
                        : t("accounts.actions.confirmDeactivateTitle", { name }),
                    body:
                      pending === "delete"
                        ? t("accounts.actions.confirmDeleteBody")
                        : t("accounts.actions.confirmDeactivateBody"),
                    confirmLabel: t("accounts.actions.confirm"),
                    cancelLabel: t("accounts.actions.cancel"),
                    onConfirm: () => void confirm(),
                    onCancel: () => setPending(null),
                    busy: confirming,
                  }
                : undefined,
            }
          : undefined
      }
    />
  );
}
