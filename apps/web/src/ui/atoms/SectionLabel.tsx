import type { ReactNode } from "react";
import "./section-label.css";

type SectionLabelProps = { as?: "h2" | "h3" | "p"; children: ReactNode };

export function SectionLabel({ as: Tag = "h2", children }: SectionLabelProps) {
  return <Tag className="section-label">{children}</Tag>;
}
