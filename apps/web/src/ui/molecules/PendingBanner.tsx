import { ChevronRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import "./pending-banner.css";

type PendingBannerProps = { to: string; title: string; caption: string };

export function PendingBanner({ to, title, caption }: PendingBannerProps) {
  return (
    <Link className="pending-banner" to={to}>
      <span className="pending-banner__icon" aria-hidden="true">
        <Clock aria-hidden="true" />
      </span>
      <span className="pending-banner__text">
        <b className="pending-banner__title">{title}</b>
        <small className="pending-banner__caption">{caption}</small>
      </span>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}
