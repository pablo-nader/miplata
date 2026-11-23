import {
  CATEGORY_COLORS,
  CATEGORY_ICON_NAMES,
  type CategoriesResponse,
  type CategoryDto,
  type CategoryType,
  categoryIconSchema,
  NAME_MAX_LENGTH,
  normalizeName,
  type UpdateCategoryRequest,
} from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { categoryColorFor } from "../../ui/atoms/CategoryBadge";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { PlaceholderScreen } from "../placeholder/PlaceholderScreen";
import { CategoryEditorScreen, type ConfirmView } from "./CategoryEditorScreen";
import { colorOf, findCategory, useLabel } from "./catalog";
import { type ApiFailure, categoriesApi } from "./categories-api";
import { failureMessage } from "./failure-message";
import { useCategories } from "./useCategories";

type IconName = (typeof CATEGORY_ICON_NAMES)[number] | null;
type Mode = "new" | "edit";

function iconOf(category: CategoryDto): IconName {
  return categoryIconSchema.safeParse(category.icon).data ?? null;
}
type Pending = "delete" | "deactivate" | null;

type FormProps = {
  catalog: CategoriesResponse;
  category: CategoryDto | null;
  type: CategoryType;
  initialGroupId: string | null;
};

function CategoryEditorForm({ catalog, category, type, initialGroupId }: FormProps) {
  const { t } = useTranslation();
  const label = useLabel();
  const navigate = useNavigate();
  const initialName = category ? label(category) : "";
  const [name, setName] = useState(initialName);
  const initialIcon = category ? iconOf(category) : null;
  const [icon, setIcon] = useState<IconName>(initialIcon);
  const [color, setColor] = useState(category ? colorOf(category) : categoryColorFor(0));
  const [groupId, setGroupId] = useState<string | null>(
    category ? category.groupId : initialGroupId,
  );
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<ApiFailure | "no_group" | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const isExpense = type === "expense";
  const listPath = isExpense ? "/categories" : "/categories?tab=income";

  async function finish(action: Promise<{ ok: boolean; error?: ApiFailure }>) {
    setBusy(true);
    const result = await action;
    if (result.ok) {
      navigate(listPath, { replace: true });
      return;
    }
    setBusy(false);
    setPending(null);
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
    if (isExpense && groupId === null) {
      setFailure("no_group");
      return;
    }
    if (!category) {
      await finish(
        categoriesApi.create({
          type,
          ...(isExpense && groupId ? { groupId } : {}),
          name: normalized,
          icon,
          color,
        }),
      );
      return;
    }
    const patch: UpdateCategoryRequest = {
      ...(normalized !== normalizeName(initialName) ? { name: normalized } : {}),
      ...(icon !== initialIcon ? { icon } : {}),
      ...(color !== colorOf(category) ? { color } : {}),
      ...(isExpense && groupId && groupId !== category.groupId ? { groupId } : {}),
    };
    if (Object.keys(patch).length === 0) {
      navigate(listPath, { replace: true });
      return;
    }
    await finish(categoriesApi.update(category.id, patch));
  }

  const displayName = normalizeName(name) || initialName;
  const actions = category
    ? [
        category.isActive
          ? { label: t("categories.editor.deactivate"), onClick: () => setPending("deactivate") }
          : {
              label: t("categories.editor.reactivate"),
              onClick: () => void finish(categoriesApi.reactivate(category.id)),
            },
        { label: t("categories.editor.delete"), onClick: () => setPending("delete") },
      ]
    : [];

  const confirm: ConfirmView | null =
    category && pending
      ? {
          title: t(`categories.confirm.${pending}Title`, { name: initialName }),
          body: t(`categories.confirm.${pending}Body`),
          confirmLabel: t("categories.confirm.confirm"),
          cancelLabel: t("categories.confirm.cancel"),
          onConfirm: () =>
            void finish(
              pending === "delete"
                ? categoriesApi.remove(category.id)
                : categoriesApi.deactivate(category.id),
            ),
          onCancel: () => setPending(null),
          busy,
        }
      : null;

  return (
    <CategoryEditorScreen
      title={category ? t("categories.editor.editTitle") : t("categories.editor.newTitle")}
      back={{ to: "/categories", label: t("categories.back") }}
      preview={{ name: displayName || "?", icon, color }}
      name={{
        label: t("categories.editor.name"),
        value: name,
        error: nameError,
        onChange: setName,
      }}
      groups={
        isExpense
          ? {
              label: t("categories.editor.group"),
              options: catalog.expenseGroups.map((group) => ({
                id: group.id,
                label: label(group),
              })),
              selectedId: groupId,
              onSelect: setGroupId,
            }
          : null
      }
      colors={{
        label: t("categories.editor.color"),
        swatchName: displayName || "?",
        options: CATEGORY_COLORS.map((value) => ({
          value: categoryColorFor(value - 1),
          label: t("categories.editor.colorOption", { number: value }),
        })),
        value: color,
        onSelect: setColor,
      }}
      icons={{
        label: t("categories.editor.icon"),
        noIconLabel: t("categories.editor.noIcon"),
        options: CATEGORY_ICON_NAMES.map((iconName) => ({
          name: iconName,
          label: t(`categories.icons.${iconName}`),
        })),
        value: icon,
        onSelect: (value) => setIcon(categoryIconSchema.safeParse(value).data ?? null),
      }}
      save={{
        label: busy ? t("categories.editor.saving") : t("categories.editor.save"),
        busy,
        onSubmit: () => void submit(),
      }}
      errorMessage={failure ? failureMessage(failure, t) : null}
      actions={actions}
      confirm={confirm}
    />
  );
}

export function CategoryEditorContainer({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { state, reload } = useCategories();
  const { categoryId } = useParams();
  const [search] = useSearchParams();

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
  const { catalog } = state;
  if (mode === "edit") {
    const category = categoryId ? findCategory(catalog, categoryId) : null;
    if (!category) {
      return (
        <PlaceholderScreen
          title={t("categories.editor.editTitle")}
          description={t("categories.back")}
          note={t("categories.errors.notFound")}
          back={{ to: "/categories", label: t("categories.back") }}
        />
      );
    }
    return (
      <CategoryEditorForm
        key={category.id}
        catalog={catalog}
        category={category}
        type={category.type}
        initialGroupId={category.groupId}
      />
    );
  }
  const type: CategoryType = search.get("type") === "income" ? "income" : "expense";
  const requested = search.get("group");
  const initialGroupId =
    catalog.expenseGroups.find((group) => group.id === requested)?.id ??
    catalog.expenseGroups[0]?.id ??
    null;
  return (
    <CategoryEditorForm
      catalog={catalog}
      category={null}
      type={type}
      initialGroupId={initialGroupId}
    />
  );
}
