import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowLeft, BookMarked, Clock, FileDiff, Layers, Loader2, RefreshCw, Upload } from "lucide-react";
import { useP4T } from "../i18n";
import type { DetailModal, DetailTab, OpenedFile, P4Changelist, P4Info, SavedWorkspace } from "../types";
import { p4Invoke } from "../ipc";
import { ActionButton } from "../components/ActionButton";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { fileBasename } from "../components/fileUtils";
import { OpenedFilesTab } from "../tabs/OpenedFilesTab";
import { ChangelistsTab } from "../tabs/ChangelistsTab";
import { BookmarksTab } from "../tabs/BookmarksTab";
import { SubmitModal } from "../modals/SubmitModal";
import { SyncModal } from "../modals/SyncModal";

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary/45">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      {detail && <p className="mt-1 truncate text-[11px] text-foreground-secondary/55">{detail}</p>}
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2 text-xs font-semibold text-foreground-secondary/70">
      <span>{label}</span>
      {count !== undefined && (
        <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-foreground-secondary">
          {count}
        </span>
      )}
    </div>
  );
}

function OutputPanel({
  title,
  output,
  loading,
  onClose,
}: {
  title: string;
  output: string;
  loading: boolean;
  onClose: () => void;
}) {
  const t = useP4T();

  return (
    <div className="border-b border-border bg-background/60">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <FileDiff size={13} className="text-primary" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{title}</span>
        <button onClick={onClose} className="rounded px-2 py-1 text-[10px] text-foreground-secondary hover:bg-surface hover:text-foreground">
          {t("p4.action.close")}
        </button>
      </div>
      <div className="max-h-[340px] overflow-auto p-3">
        {loading ? (
          <div className="py-10 text-center text-xs text-foreground-secondary/45">{t("p4.loadingInfo")}</div>
        ) : output.trim() ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground-secondary">{output}</pre>
        ) : (
          <div className="py-10 text-center text-xs text-foreground-secondary/45">{t("p4.panel.empty")}</div>
        )}
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState<DetailTab>("overview");
  const [openedFiles, setOpenedFiles] = useState<OpenedFile[]>([]);
  const [pendingChanges, setPendingChanges] = useState<P4Changelist[]>([]);
  const [submittedChanges, setSubmittedChanges] = useState<P4Changelist[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<DetailModal>(null);
  const [outputPanel, setOutputPanel] = useState<{ title: string; output: string; loading: boolean } | null>(null);

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

  const openedByAction = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of openedFiles) {
      counts.set(file.action, (counts.get(file.action) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [openedFiles]);

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

  const handleRevertFile = (depotPath: string) => {
    if (!window.confirm(`${t("p4.confirm.revertFile")}\n${depotPath}`)) return;
    void runAction(async () => {
      const res = await p4Invoke<{ output: string }>("p4_revert", { workspace_id: wsId, files: [depotPath] });
      return res.output || t("p4.feedback.reverted");
    });
  };

  const handleDiffFile = async (depotPath: string) => {
    setOutputPanel({ title: `${t("p4.action.diff")} · ${depotPath}`, output: "", loading: true });
    setError(null);
    try {
      const res = await p4Invoke<{ output: string }>("p4_diff", { workspace_id: wsId, files: [depotPath] });
      setOutputPanel({ title: `${t("p4.action.diff")} · ${depotPath}`, output: res.output || "", loading: false });
    } catch (e) {
      setOutputPanel(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDescribe = async (cl: string) => {
    setOutputPanel({ title: `${t("p4.changelist")} #${cl}`, output: "", loading: true });
    setError(null);
    try {
      const res = await p4Invoke<{ output: string }>("p4_describe", { workspace_id: wsId, changelist: cl });
      setOutputPanel({ title: `${t("p4.changelist")} #${cl}`, output: res.output || "", loading: false });
    } catch (e) {
      setOutputPanel(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

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

  const tabs: { key: DetailTab; label: string; badge?: number; icon: ReactNode }[] = [
    { key: "overview",  label: t("p4.tab.overview"),  icon: <Layers size={12} /> },
    { key: "opened",    label: t("p4.tab.opened"),    badge: openedFiles.length || undefined, icon: <FileDiff size={12} /> },
    { key: "pending",   label: t("p4.tab.pending"),   badge: pendingChanges.length || undefined, icon: <Layers size={12} /> },
    { key: "history",   label: t("p4.tab.history"),   icon: <Clock size={12} /> },
    { key: "sync",      label: t("p4.tab.sync"),      icon: <RefreshCw size={12} /> },
    { key: "bookmarks", label: t("p4.tab.bookmarks"), icon: <BookMarked size={12} /> },
  ];

  return (
    <section className="mx-auto flex min-h-[700px] max-w-6xl flex-col overflow-hidden rounded-lg border border-border bg-surface/20">
      <div className="space-y-3 border-b border-border p-4">
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
            <ActionButton label={t("p4.action.refresh")} onClick={() => void loadAll()} disabled={busy || loading} icon={<RefreshCw size={12} />} />
            <ActionButton label={t("p4.action.syncAll")} onClick={handleSyncAll} disabled={busy || loading} icon={<RefreshCw size={12} />} variant="primary" />
            <ActionButton label={t("p4.action.syncPath")} onClick={() => setModal("sync")} disabled={busy} icon={<RefreshCw size={12} />} />
            <ActionButton label={t("p4.action.revertUnchanged")} onClick={handleRevertUnchanged} disabled={busy || openedFiles.length === 0} />
            <ActionButton label={t("p4.action.submit")} onClick={() => setModal("submit")} disabled={busy || openedFiles.length === 0} icon={<Upload size={12} />} variant="primary" />
          </div>
        </div>

        {error && <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />}
        {success && !error && <FeedbackBanner tone="success" message={success} onClose={() => setSuccess(null)} />}
      </div>

      <div className="flex border-b border-border text-xs shrink-0 overflow-x-auto">
        {tabs.map(({ key, label, badge, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 transition-colors",
              tab === key ? "border-b-2 border-primary text-primary" : "text-foreground-secondary/60 hover:text-foreground",
            )}
          >
            {icon}
            {label}
            {badge !== undefined && (
              <span className={clsx(
                "ml-1 rounded px-1.5 py-0.5 text-[9px]",
                tab === key ? "bg-primary/20 text-primary" : "bg-background text-foreground-secondary/60",
              )}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {outputPanel && (
        <OutputPanel
          title={outputPanel.title}
          output={outputPanel.output}
          loading={outputPanel.loading}
          onClose={() => setOutputPanel(null)}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && tab !== "bookmarks" ? (
          <div className="flex items-center justify-center py-16 text-foreground-secondary/40">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-sm">{t("p4.loadingInfo")}</span>
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <div className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard label={t("p4.metric.opened")} value={openedFiles.length} detail={openedByAction.map(([action, count]) => `${action} ${count}`).join(" · ") || t("p4.opened.empty")} />
                  <MetricCard label={t("p4.metric.pending")} value={pendingChanges.length} detail={pendingChanges[0]?.description || t("p4.pending.empty")} />
                  <MetricCard label={t("p4.metric.history")} value={submittedChanges.length} detail={submittedChanges[0]?.date || t("p4.history.empty")} />
                  <MetricCard label={t("p4.metric.client")} value={info?.client || workspace.client} detail={info?.client_root || workspace.root || workspace.port} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),360px]">
                  <div className="rounded-lg border border-border bg-background/55">
                    <SectionHeader label={t("p4.section.recentOpened")} count={Math.min(openedFiles.length, 8)} />
                    {openedFiles.length === 0 ? (
                      <div className="px-3 py-8 text-center text-xs text-foreground-secondary/40">{t("p4.opened.empty")}</div>
                    ) : (
                      openedFiles.slice(0, 8).map((file) => (
                        <div key={file.depot_path} className="flex items-center gap-2 border-b border-border/25 px-3 py-2">
                          <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-primary">{file.action}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-xs text-foreground">{fileBasename(file.depot_path)}</p>
                            <p className="truncate text-[10px] text-foreground-secondary/45">{file.depot_path}</p>
                          </div>
                          <button
                            onClick={() => void handleDiffFile(file.depot_path)}
                            disabled={busy}
                            className="rounded-md px-2 py-1 text-[10px] text-foreground-secondary/60 hover:bg-surface hover:text-foreground disabled:opacity-40"
                          >
                            {t("p4.action.diff")}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <aside className="space-y-3">
                    <div className="rounded-lg border border-border bg-background/70 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-secondary/50">{t("p4.section.quickActions")}</p>
                      <div className="flex flex-wrap gap-2">
                        <ActionButton label={t("p4.action.syncAll")} onClick={handleSyncAll} disabled={busy} icon={<RefreshCw size={12} />} variant="primary" />
                        <ActionButton label={t("p4.action.syncPath")} onClick={() => setModal("sync")} disabled={busy} icon={<RefreshCw size={12} />} />
                        <ActionButton label={t("p4.action.revertUnchanged")} onClick={handleRevertUnchanged} disabled={busy || openedFiles.length === 0} />
                        <ActionButton label={t("p4.action.submit")} onClick={() => setModal("submit")} disabled={busy || openedFiles.length === 0} icon={<Upload size={12} />} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/55">
                      <SectionHeader label={t("p4.section.recentChangelists")} count={pendingChanges.length} />
                      {pendingChanges.length === 0 ? (
                        <div className="px-3 py-6 text-center text-xs text-foreground-secondary/40">{t("p4.pending.empty")}</div>
                      ) : (
                        pendingChanges.slice(0, 5).map((cl) => (
                          <button
                            key={cl.number}
                            onClick={() => void handleDescribe(cl.number)}
                            className="block w-full border-b border-border/25 px-3 py-2 text-left transition-colors hover:bg-surface/30"
                          >
                            <code className="text-xs text-primary">#{cl.number}</code>
                            <p className="mt-1 line-clamp-2 text-xs text-foreground">{cl.description}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            )}

            {tab === "opened" && (
              <OpenedFilesTab files={openedFiles} onRevertFile={handleRevertFile} onDiffFile={(path) => void handleDiffFile(path)} busy={busy} />
            )}
            {tab === "pending" && (
              <ChangelistsTab
                changelists={pendingChanges}
                emptyKey="p4.pending.empty"
                onDescribe={(cl) => void handleDescribe(cl)}
                onShelve={handleShelve}
                onUnshelve={handleUnshelve}
                busy={busy}
              />
            )}
            {tab === "history" && (
              <ChangelistsTab
                changelists={submittedChanges}
                emptyKey="p4.history.empty"
                onDescribe={(cl) => void handleDescribe(cl)}
                busy={busy}
              />
            )}
            {tab === "sync" && (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                <button
                  onClick={handleSyncAll}
                  disabled={busy}
                  className="rounded-lg border border-border bg-background/70 p-4 text-left transition-colors hover:bg-surface disabled:opacity-50"
                >
                  <RefreshCw size={15} className="mb-3 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{t("p4.sync.workspaceLatest")}</p>
                  <p className="mt-1 truncate text-xs text-foreground-secondary/50">{info?.client_root || workspace.root || workspace.client}</p>
                </button>
                <button
                  onClick={() => setModal("sync")}
                  disabled={busy}
                  className="rounded-lg border border-border bg-background/70 p-4 text-left transition-colors hover:bg-surface disabled:opacity-50"
                >
                  <BookMarked size={15} className="mb-3 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{t("p4.sync.pathOrChangelist")}</p>
                  <p className="mt-1 truncate text-xs text-foreground-secondary/50">{workspace.port}</p>
                </button>
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
