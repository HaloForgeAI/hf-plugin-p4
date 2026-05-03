import type { ReactNode } from "react";
import clsx from "clsx";

export function ActionButton({
  label,
  onClick,
  disabled,
  icon,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : variant === "danger"
          ? "border-error/30 bg-error/5 text-error/70 hover:bg-error/10 hover:text-error"
          : "border-border bg-background text-foreground-secondary hover:bg-surface hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
