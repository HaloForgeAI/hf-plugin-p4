import clsx from "clsx";
import { X } from "lucide-react";

export function FeedbackBanner({
  tone,
  message,
  onClose,
}: {
  tone: "error" | "success";
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className={clsx(
      "flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs",
      tone === "error"
        ? "border-red-500/20 bg-red-500/5 text-red-400"
        : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    )}>
      <span className="flex-1 leading-relaxed">{message}</span>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-50 hover:opacity-100">
          <X size={11} />
        </button>
      )}
    </div>
  );
}
