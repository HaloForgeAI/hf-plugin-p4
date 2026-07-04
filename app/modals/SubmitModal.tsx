import { useState } from "react";
import clsx from "clsx";
import { Loader2, X } from "lucide-react";
import { useP4T } from "../i18n";
import type { OpenedFile } from "../types";
import { p4Invoke } from "../ipc";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { ModalOverlay } from "../components/ModalOverlay";
import { actionIcon, actionColor, depotPathWithRev } from "../components/fileUtils";

export function SubmitModal({
  workspaceId,
  openedFiles,
  onClose,
  onSubmitted,
  onError,
}: {
  workspaceId: string;
  openedFiles: OpenedFile[];
  onClose: () => void;
  onSubmitted: (output: string) => void;
  onError?: (message: string) => void;
}) {
  const t = useP4T();
  const [desc, setDesc] = useState("");
  const [reopen, setReopen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!desc.trim()) { setError(t("p4.submit.missingDesc")); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await p4Invoke<{ output: string }>("p4_submit", {
        workspace_id: workspaceId,
        description: desc.trim(),
        reopen,
      });
      onSubmitted(res.output);
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
          <h3 className="text-sm font-semibold text-foreground">{t("p4.submit.title")}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-foreground-secondary/40 hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {openedFiles.length === 0 ? (
          <p className="text-xs text-foreground-secondary/60">{t("p4.submit.empty")}</p>
        ) : (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background/50 divide-y divide-border/40">
            {openedFiles.slice(0, 50).map((f, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5">
                {actionIcon(f.action)}
                <span className={clsx("min-w-0 flex-1 break-all font-mono text-xs leading-snug", actionColor(f.action))} title={f.depot_path}>
                  {depotPathWithRev(f.depot_path, f.rev)}
                </span>
                <span className="ml-auto text-[10px] text-foreground-secondary/40 shrink-0">{f.action}</span>
              </div>
            ))}
            {openedFiles.length > 50 && (
              <p className="px-3 py-1.5 text-[10px] text-foreground-secondary/50">
                … and {openedFiles.length - 50} more
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">{t("p4.submit.description")}</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder={t("p4.submit.descPlaceholder")}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary/40 focus:border-primary/40 focus:outline-none resize-none transition-all"
            autoFocus
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-foreground-secondary/70">
          <input type="checkbox" checked={reopen} onChange={(e) => setReopen(e.target.checked)} className="rounded border-border bg-background" />
          {t("p4.submit.reopen")}
        </label>

        {error && <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />}

        <div className="flex gap-2">
          <button
            onClick={() => void handleSubmit()}
            disabled={busy || !desc.trim() || openedFiles.length === 0}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : t("p4.submit.confirm")}
          </button>
          <button onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground-secondary hover:text-foreground transition-colors">
            {t("p4.cancel")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
