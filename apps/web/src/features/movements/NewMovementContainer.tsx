import { useState } from "react";
import { CategoryPickerContainer } from "../categories/CategoryPickerContainer";
import { PlaceholderContainer } from "../placeholder/PlaceholderContainer";

export function NewMovementContainer() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  return (
    <>
      <PlaceholderContainer focused screen="newMovement" />
      <CategoryPickerContainer type="expense" value={categoryId} onChange={setCategoryId} />
    </>
  );
}
