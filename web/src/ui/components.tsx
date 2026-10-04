import { useEffect } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  CheckCircle,
  Flask,
  GitBranch,
  MinusCircle,
  Question,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";

export type PanelState = "ready" | "loading" | "empty" | "error";
export type EvidenceLevel =
  | "observado"
  | "inferido"
  | "hipotesis"
  | "contradicho";
const cx = (...values: (string | undefined | false)[]) =>
  values.filter(Boolean).join(" ");

export function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx("cn-button", `cn-button--${variant}`, className)}
    >
      {loading && <span className="cn-loading-mark" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Panel({
  title,
  trailing,
  state = "ready",
  emptyMessage = "No evidence yet.",
  emptyAction,
  errorMessage = "Evidence could not be loaded.",
  onRetry,
  children,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  trailing?: ReactNode;
  state?: PanelState;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  return (
    <section
      {...props}
      className={cx("cn-panel", className)}
      aria-busy={state === "loading" || undefined}
    >
      {(title || trailing) && (
        <header className="cn-panel-header">
          <h2>{title}</h2>
          {trailing}
        </header>
      )}
      <div className="cn-panel-body">
        {state === "ready" && children}
        {state === "loading" && (
          <div role="status" className="cn-panel-state">
            <span className="cn-sr-only">Loading evidence</span>
            <div className="cn-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        {state === "empty" && (
          <div className="cn-panel-state">
            <p>{emptyMessage}</p>
            {emptyAction}
          </div>
        )}
        {state === "error" && (
          <div className="cn-panel-state">
            <p role="alert" className="cn-error">
              <WarningOctagon size={18} aria-hidden="true" />
              {errorMessage}
            </p>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Chip({
  label,
  hpoId,
  present,
  onToggle,
  onRemove,
}: {
  label: string;
  hpoId?: string;
  present: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const Icon = present ? CheckCircle : MinusCircle;
  const content = (
    <>
      <Icon size={16} aria-hidden="true" />
      <span>
        {!present && "no "}
        <span className="cn-chip-term">{label}</span>
      </span>
    </>
  );
  return (
    <span
      className={cx("cn-chip", !present && "cn-chip--negated")}
      title={hpoId}
    >
      {onToggle ? (
        <button
          type="button"
          className="cn-chip-main"
          aria-pressed={present}
          aria-label={`${present ? label : `no ${label}`}: ${present ? "negate" : "mark present"}`}
          onClick={onToggle}
        >
          {content}
        </button>
      ) : (
        <span className="cn-chip-main">{content}</span>
      )}
      {onRemove && (
        <button
          type="button"
          className="cn-chip-remove"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

const evidence = {
  observado: { label: "Observed", Icon: CheckCircle },
  inferido: { label: "Inferred", Icon: GitBranch },
  hipotesis: { label: "Hypothesis", Icon: Question },
  contradicho: { label: "Contradicted", Icon: WarningOctagon },
};
export function EvidenceBadge({
  level,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { level: EvidenceLevel }) {
  const { label, Icon } = evidence[level];
  return (
    <span
      {...props}
      className={cx("cn-evidence", `cn-evidence--${level}`, className)}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </span>
  );
}

const format = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
function AnimatedPercent({ value }: { value: number }) {
  const count = useMotionValue(value);
  const text = useTransform(count, format);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [count, reduced, value]);
  return <motion.span aria-hidden="true">{text}</motion.span>;
}
export function Meter({
  pct,
  low,
  high,
  label = "Phenotype match",
}: {
  pct: number;
  low: number;
  high: number;
  label?: string;
}) {
  if (
    ![pct, low, high].every(Number.isFinite) ||
    low < 0 ||
    high > 100 ||
    low > pct ||
    pct > high
  )
    return (
      <p role="status" className="cn-muted">
        Match unavailable
      </p>
    );
  return (
    <div className="cn-meter">
      <div className="cn-meter-heading">
        <span>{label}</span>
        <strong>
          <span className="cn-sr-only">{format(pct)}%</span>
          <AnimatedPercent value={pct} />
          <span aria-hidden="true">%</span>
        </strong>
      </div>
      <div
        className="cn-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${format(pct)} percent, range ${format(low)} to ${format(high)} percent`}
      >
        <span
          className="cn-meter-fill"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
        <span
          className="cn-meter-range"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />
        <span className="cn-meter-point" style={{ left: `${pct}%` }} />
      </div>
      <div className="cn-meter-caption">
        <span>0</span>
        <span>
          Range {format(low)} to {format(high)}%
        </span>
        <span>100</span>
      </div>
    </div>
  );
}
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd {...props} className={cx("cn-kbd", className)} />;
}
export function SampleBadge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props} className={cx("cn-sample", className)}>
      <Flask size={16} aria-hidden="true" />
      Sample case
    </span>
  );
}
