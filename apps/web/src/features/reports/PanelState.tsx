import { PieChart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";

export type PanelStatus = "loading" | "error" | "ready";

export type PanelMessages = {
  loading: string;
  loadFailed: string;
  retry: string;
  empty: string;
};

type PanelStateProps = {
  status: PanelStatus;
  empty: boolean;
  messages: PanelMessages;
  onRetry: () => void;
  children: ReactNode;
};

export function PanelState({ status, empty, messages, onRetry, children }: PanelStateProps) {
  if (status === "loading") {
    return (
      <p className="report-note" role="status">
        {messages.loading}
      </p>
    );
  }
  if (status === "error") {
    return (
      <EmptyState
        icon={<PieChart />}
        title={messages.loadFailed}
        action={
          <Button variant="ghost" onClick={onRetry}>
            {messages.retry}
          </Button>
        }
      />
    );
  }
  if (empty) {
    return <EmptyState icon={<PieChart />} title={messages.empty} />;
  }
  return <>{children}</>;
}
