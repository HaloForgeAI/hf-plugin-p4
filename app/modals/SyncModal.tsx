import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useP4T } from "../i18n";
import { p4Invoke } from "../ipc";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { ModalOverlay } from "../components/ModalOverlay";

export function SyncModal({
  workspaceId,
  initialPath,
  initialCl,
  initialForce,
  onClose,
  onSynced,
  onError,
}: {
  workspaceId: string;
  initialPath?: string;
  initialCl?: string;
  initialForce?: boolean;
  onClose: () => void;
  onSynced: (output: string) => void;
  onError?: (message: string) => void;
}) {
  const t = useP4T();
  const [path, setPath] = useState(initialPath ?? "");
  const [cl, setCl] = useState(initialCl ?? "");
  const [force, setForce] = useState(initialForce ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await p4Invoke<{ output: string }>("p4_sync", {
        workspace_id: workspaceId,
        path: path.trim() || undefined,
        changelist: cl.replace(/^@/, "").trim() || undefined,
        force,
      });
      onSynced(res.output || t("p4.feedback.synced"));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{t("p4.sync.title")}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-foreground-secondary/40 hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">{t("p4.sync.pathLabel")}</label>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={t("p4.sync.pathPlaceholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-foreground-secondary/40 focus:border-primary/40 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">{t("p4.sync.clLabel")}</label>
            <input
              value={cl}
              onChange={(e) => setCl(e.target.value)}
              placeholder={t("p4.sync.clPlaceholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-foreground-secondary/40 focus:border-primary/40 focus:outline-none transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground-secondary/70">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="rounded border-border bg-background" />
            {t("p4.sync.force")}
          </label>
        </div>

        {error && <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />}

        <div className="flex gap-2">
          <button
            onClick={() => void handleSync()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={13} /> {t("p4.sync.run")}</>}
          </button>
          <button onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground-secondary hover:text-foreground transition-colors">
            {t("p4.cancel")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
