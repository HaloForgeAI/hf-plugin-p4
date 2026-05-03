import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, Layers, Loader2, RefreshCw, Upload } from "lucide-react";
import { useP4T } from "../i18n";
import type { DetailModal, DetailTab, OpenedFile, P4Changelist, P4Info, SavedWorkspace } from "../types";
import { p4Invoke } from "../ipc";
import { ActionButton } from "../components/ActionButton";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { OpenedFilesTab } from "../tabs/OpenedFilesTab";
import { ChangelistsTab } from "../tabs/ChangelistsTab";
import { BookmarksTab } from "../tabs/BookmarksTab";
import { SubmitModal } from "../modals/SubmitModal";
import { SyncModal } from "../modals/SyncModal";

export function DetailPage({
  workspace,
  info,
  onBack,
}: {
  workspace: SavedWorkspace;
  info: P4Info | null;
  onBack: () => void;
}) {
  const t = useP4T();
  const [tab, setTab] = useState<DetailTab>("opened");
  const [openedFiles, setOpenedFiles] = useState<OpenedFile[]>([]);
  const [pendingChanges, setPendingChanges] = useState<P4Changelist[]>([]);
  const [submittedChanges, setSubmittedChanges] = useState<P4Changelist[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<DetailModal>(null);

  const wsId = workspace.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [openedRes, pendingRes, submittedRes] = await Promise.all([
        p4Invoke<{ files: OpenedFile[] }>("p4_opened", { workspace_id: wsId }),
        p4Invoke<{ changelists: P4Changelist[] }>("p4_pending_changes", { workspace_id: wsId }),
        p4Invoke<{ changelists: P4Changelist[] }>("p4_submitted_changes", { workspace_id: wsId }),
      ]);
      setOpenedFiles(openedRes.files);
      setPendingChanges(pendingRes.changelists);
      setSubmittedChanges(submittedRes.changelists);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const runAction = async (fn: () => Promise<string | undefined>) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const msg = await fn();
      setSuccess(msg ?? t("p4.feedback.actionDone"));
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSyncAll = () =>
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_sync", { workspace_id: wsId });
      return res.output || t("p4.feedback.synced");
    });

  const handleRevertUnchanged = () =>
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_revert_unchanged", { workspace_id: wsId });
      return res.output || t("p4.feedback.reverted");
    });

  const handleRevertFile = (depotPath: string) =>
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_revert", { workspace_id: wsId, files: [depotPath] });
      return res.output || t("p4.feedback.reverted");
    });

  const handleShelve = (cl: string) =>
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_shelve", { workspace_id: wsId, changelist: cl });
      return res.output || t("p4.feedback.shelved");
    });

  const handleUnshelve = (sourceCl: string) =>
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_unshelve", {
        workspace_id: wsId,
        source_changelist: sourceCl,
      });
      return res.output || t("p4.feedback.unshelved");
    });

  const tabs: { key: DetailTab; label: string; badge?: number }[] = [
    { key: "opened",    label: t("p4.tab.opened"),    badge: openedFiles.length || undefined },
    { key: "pending",   label: t("p4.tab.pending"),   badge: pendingChanges.length || undefined },
    { key: "history",   label: t("p4.tab.history") },
    { key: "sync",      label: t("p4.tab.sync") },
    { key: "bookmarks", label: t("p4.tab.bookmarks") },
  ];

  return (
    <section className="mx-auto flex min-h-[680px] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface/20">
      {/* Header */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
          >
            <ArrowLeft size={12} />
            {t("p4.backToWorkspaces")}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Layers size={14} className="shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold text-foreground">{workspace.alias}</span>
              {info && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                  {t("p4.connected")}
                </span>
              )}
            </div>
            {info && (
              <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-foreground-secondary/50">
                <span className="font-mono">{info.server_address}</span>
                <span>{info.user} @ {info.client}</span>
                {info.client_root && <span className="truncate">{info.client_root}</span>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <ActionButton
              label={t("p4.action.refresh")}
              onClick={() => void loadAll()}
              disabled={busy || loading}
              icon={<RefreshCw size={12} />}
            />
            <ActionButton
              label={t("p4.action.syncAll")}
              onClick={handleSyncAll}
              disabled={busy || loading}
              icon={<RefreshCw size={12} />}
              variant="primary"
            />
            <ActionButton
              label={t("p4.action.syncPath")}
              onClick={() => setModal("sync")}
              disabled={busy}
              icon={<RefreshCw size={12} />}
            />
            <ActionButton
              label={t("p4.action.revertUnchanged")}
              onClick={handleRevertUnchanged}
              disabled={busy || openedFiles.length === 0}
            />
            <ActionButton
              label={t("p4.action.submit")}
              onClick={() => setModal("submit")}
              disabled={busy || openedFiles.length === 0}
              icon={<Upload size={12} />}
              variant="primary"
            />
          </div>
        </div>

        {error && <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />}
        {success && !error && <FeedbackBanner tone="success" message={success} onClose={() => setSuccess(null)} />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs shrink-0 overflow-x-auto">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "shrink-0 px-4 py-2.5 transition-colors",
              tab === key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground-secondary/60 hover:text-foreground",
            )}
          >
            {label}
            {badge !== undefined && (
              <span className={clsx(
                "ml-1.5 rounded px-1.5 py-0.5 text-[9px]",
                tab === key ? "bg-primary/20 text-primary" : "bg-background text-foreground-secondary/60",
              )}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && tab !== "bookmarks" ? (
          <div className="flex items-center justify-center py-16 text-foreground-secondary/40">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-sm">{t("p4.loadingInfo")}</span>
          </div>
        ) : (
          <>
            {tab === "opened" && (
              <OpenedFilesTab files={openedFiles} onRevertFile={handleRevertFile} busy={busy} />
            )}
            {tab === "pending" && (
              <ChangelistsTab
                changelists={pendingChanges}
                emptyKey="p4.pending.empty"
                onShelve={handleShelve}
                onUnshelve={handleUnshelve}
                busy={busy}
              />
            )}
            {tab === "history" && (
              <ChangelistsTab changelists={submittedChanges} emptyKey="p4.history.empty" busy={busy} />
            )}
            {tab === "sync" && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-foreground-secondary/60">
                  Use <strong>{t("p4.action.syncPath")}</strong> for targeted sync, or{" "}
                  <strong>{t("p4.action.syncAll")}</strong> to bring the entire workspace up to latest.
                </p>
                <div className="flex gap-2">
                  <ActionButton
                    label={t("p4.action.syncAll")}
                    onClick={handleSyncAll}
                    disabled={busy}
                    icon={<RefreshCw size={12} />}
                    variant="primary"
                  />
                  <ActionButton
                    label={t("p4.action.syncPath")}
                    onClick={() => setModal("sync")}
                    disabled={busy}
                    icon={<RefreshCw size={12} />}
                  />
                </div>
              </div>
            )}
            {tab === "bookmarks" && (
              <BookmarksTab
                workspaceId={wsId}
                onSyncStart={() => { setBusy(true); setError(null); setSuccess(null); }}
                onSyncDone={(msg) => { setBusy(false); setSuccess(msg); }}
                onError={(msg) => { setBusy(false); setError(msg); }}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal === "submit" && (
        <SubmitModal
          workspaceId={wsId}
          openedFiles={openedFiles}
          onClose={() => setModal(null)}
          onSubmitted={(output) => {
            setModal(null);
            setSuccess(output || t("p4.feedback.submitted"));
            void loadAll();
          }}
        />
      )}
      {modal === "sync" && (
        <SyncModal
          workspaceId={wsId}
          onClose={() => setModal(null)}
          onSynced={(output) => {
            setModal(null);
            setSuccess(output);
            void loadAll();
          }}
        />
      )}
    </section>
  );
}
