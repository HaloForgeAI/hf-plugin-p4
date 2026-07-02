import { useP4T } from "../i18n";
import type { P4Changelist } from "../types";

export function ChangelistsTab({
  changelists,
  emptyKey,
  onDescribe,
  onShelve,
  onUnshelve,
  busy,
}: {
  changelists: P4Changelist[];
  emptyKey: "p4.pending.empty" | "p4.history.empty";
  onDescribe?: (cl: string) => void;
  onShelve?: (cl: string) => void;
  onUnshelve?: (cl: string) => void;
  busy: boolean;
}) {
  const t = useP4T();

  if (changelists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground-secondary/40">
        <p className="text-sm">{t(emptyKey)}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {changelists.map((cl) => (
        <div key={cl.number} className="group flex items-start gap-3 px-4 py-3 hover:bg-surface/30 transition-colors">
          <code className="mt-0.5 shrink-0 text-xs text-primary">#{cl.number}</code>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-foreground line-clamp-2">{cl.description}</p>
            <p className="mt-1 text-[10px] text-foreground-secondary/50">
              {cl.user}@{cl.client} · {cl.date}
            </p>
          </div>
          {(onDescribe || onShelve || onUnshelve) && (
            <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onDescribe && (
                <button
                  onClick={() => onDescribe(cl.number)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-[10px] text-foreground-secondary/60 hover:bg-surface hover:text-foreground transition-colors"
                >
                  {t("p4.action.details")}
                </button>
              )}
              {onShelve && (
                <button
                  onClick={() => onShelve(cl.number)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-[10px] text-foreground-secondary/60 hover:bg-surface hover:text-foreground transition-colors"
                >
                  {t("p4.action.shelve")}
                </button>
              )}
              {onUnshelve && (
                <button
                  onClick={() => onUnshelve(cl.number)}
                  disabled={busy}
                  className="rounded-md px-2 py-1 text-[10px] text-foreground-secondary/60 hover:bg-surface hover:text-foreground transition-colors"
                >
                  {t("p4.action.unshelve")}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
