import { type CategoryGroupDto, NAME_MAX_LENGTH, normalizeName } from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useOnline } from "../../shared/use-online";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { PlaceholderScreen } from "../placeholder/PlaceholderScreen";
import { useLabel } from "./catalog";
import { type ApiFailure, categoriesApi } from "./categories-api";
import { failureMessage } from "./failure-message";
import { GroupEditorScreen } from "./GroupEditorScreen";
import { useCategories } from "./useCategories";

type FormProps = { group: CategoryGroupDto | null };

function GroupEditorForm({ group }: FormProps) {
  const { t } = useTranslation();
  const label = useLabel();
  const navigate = useNavigate();
  const online = useOnline();
  const initialName = group ? label(group) : "";
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function finish(action: Promise<{ ok: boolean; error?: ApiFailure }>) {
    setBusy(true);
    const result = await action;
    if (result.ok) {
      navigate("/categories", { replace: true });
      return;
    }
    setBusy(false);
    setConfirming(false);
    setFailure(result.error ?? "unknown");
  }

  async function submit() {
    const normalized = normalizeName(name);
    setFailure(null);
    if (normalized.length === 0) {
      setNameError(t("categories.errors.nameRequired"));
      return;
    }
    if (normalized.length > NAME_MAX_LENGTH) {
      setNameError(t("categories.errors.nameTooLong", { max: NAME_MAX_LENGTH }));
      return;
    }
    setNameError(undefined);
    if (!group) {
      await finish(categoriesApi.createGroup(normalized));
      return;
    }
    if (normalized === normalizeName(initialName)) {
      navigate("/categories", { replace: true });
      return;
    }
    await finish(categoriesApi.renameGroup(group.id, normalized));
  }

  return (
    <GroupEditorScreen
      title={group ? t("categories.groupEditor.editTitle") : t("categories.groupEditor.newTitle")}
      back={{ to: "/categories", label: t("categories.back") }}
      name={{
        label: t("categories.groupEditor.name"),
        value: name,
        error: nameError,
        onChange: setName,
      }}
      save={{
        label: busy ? t("categories.editor.saving") : t("categories.groupEditor.save"),
        busy,
        onSubmit: () => void submit(),
      }}
      offlineMessage={online ? null : t("offline.saveDisabled")}
      errorMessage={failure ? failureMessage(failure, t) : null}
      remove={
        group
          ? { label: t("categories.groupEditor.delete"), onClick: () => setConfirming(true) }
          : null
      }
      confirm={
        group && confirming
          ? {
              title: t("categories.confirm.deleteGroupTitle", { name: initialName }),
              body: t("categories.confirm.deleteGroupBody"),
              confirmLabel: t("categories.confirm.confirm"),
              cancelLabel: t("categories.confirm.cancel"),
              onConfirm: () => void finish(categoriesApi.removeGroup(group.id)),
              onCancel: () => setConfirming(false),
              busy,
            }
          : null
      }
    />
  );
}

export function GroupEditorContainer({ mode }: { mode: "new" | "edit" }) {
  const { t } = useTranslation();
  const { state, reload } = useCategories();
  const { groupId } = useParams();

  if (state.status === "loading") {
    return <p role="status">{t("categories.loading")}</p>;
  }
  if (state.status === "error") {
    return (
      <EmptyState
        title={t("categories.loadFailed")}
        action={<Button onClick={reload}>{t("categories.retry")}</Button>}
      />
    );
  }
  if (mode === "new") {
    return <GroupEditorForm group={null} />;
  }
  const group = state.catalog.expenseGroups.find((item) => item.id === groupId);
  if (!group) {
    return (
      <PlaceholderScreen
        title={t("categories.groupEditor.editTitle")}
        description={t("categories.back")}
        note={t("categories.errors.notFound")}
        back={{ to: "/categories", label: t("categories.back") }}
      />
    );
  }
  return <GroupEditorForm key={group.id} group={group} />;
}
