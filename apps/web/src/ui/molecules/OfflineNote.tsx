import { WifiOff } from "lucide-react";
import "./offline-note.css";

type OfflineNoteProps = {
  message: string;
};

export function OfflineNote({ message }: OfflineNoteProps) {
  return (
    <p className="offline-note" role="status">
      <WifiOff aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
