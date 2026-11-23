import type { LucideIcon } from "lucide-react";

export type NavItem = {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export type NavAction = { to: string; label: string };
