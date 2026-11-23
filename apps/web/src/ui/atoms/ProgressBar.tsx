import "./progress-bar.css";

type ProgressBarProps = { value: number; max: number; label: string; nearRatio?: number };

export function ProgressBar({ value, max, label, nearRatio = 0.8 }: ProgressBarProps) {
  const ratio = max > 0 ? Math.max(0, value / max) : 0;
  const width = Math.min(100, ratio * 100);
  const classes = ratio >= nearRatio ? "progress-bar progress-bar--near" : "progress-bar";
  return (
    <div
      className={classes}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
    >
      <span className="progress-bar__fill" style={{ width: `${width}%` }} />
    </div>
  );
}
