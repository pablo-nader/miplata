import { WifiOff } from "lucide-react";
import "./offline-banner.css";

type OfflineBannerProps = {
  message: string;
};

export function OfflineBanner({ message }: OfflineBannerProps) {
  return (
    <div className="offline-banner" role="status">
      <WifiOff aria-hidden="true" />
      <p className="offline-banner__text">{message}</p>
    </div>
  );
}
