import { useCallback, useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useP4T } from "../i18n";
import type { SavedBookmark } from "../types";
import { p4Invoke } from "../ipc";
import { BookmarkFormModal } from "../modals/BookmarkFormModal";

type BookmarkModalState = { mode: "add" } | { mode: "edit"; bookmark: SavedBookmark } | null;

export function BookmarksTab({
  workspaceId,
  onSyncStart,
  onSyncDone,
  onError,
}: {
  workspaceId: string;
  onSyncStart: () => void;
  onSyncDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const t = useP4T();
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<BookmarkModalState>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await p4Invoke<{ bookmarks: SavedBookmark[] }>("p4_saved_bookmarks", {
        workspace_id: workspaceId,
      });
      setBookmarks(res.bookmarks);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, onError]);

  useEffect(() => { void loadBookmarks(); }, [loadBookmarks]);

  const handleRemove = async (id: string) => {
    try {
      await p4Invoke("p4_remove_bookmark", { id });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleQuickSync = async (bm: SavedBookmark) => {
    setSyncingId(bm.id);
    onSyncStart();
    try {
      const res = await p4Invoke<{ output: string }>("p4_sync", {
        workspace_id: workspaceId,
        path: bm.depot_path || undefined,
        changelist: bm.changelist.replace(/^@/, "").trim() || undefined,
        force: bm.force,
      });
      onSyncDone(res.output || t("p4.feedback.synced"));
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground-secondary/40">
        <Loader2 size={16} className="animate-spin mr-2" />
        <span className="text-sm">{t("p4.loadingInfo")}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
        <span className="text-xs text-foreground-secondary/50">
          {bookmarks.length} {t("p4.tab.bookmarks").toLowerCase()}
        </span>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
        >
          <BookmarkPlus size={12} />
          {t("p4.bookmark.add")}
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-secondary/40">
          <Bookmark size={32} className="opacity-20" />
          <p className="text-sm text-center max-w-xs">{t("p4.bookmark.empty")}</p>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
          >
            <BookmarkPlus size={12} />
            {t("p4.bookmark.add")}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="group flex items-center gap-3 px-4 py-3 hover:bg-surface/30 transition-colors"
            >
              <Bookmark size={13} className="shrink-0 text-primary/60" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{bm.name}</p>
                <p className="text-[10px] font-mono text-foreground-secondary/60 truncate">
                  {bm.depot_path}
                  {bm.changelist && (
                    <span className="ml-1 text-primary/60">@{bm.changelist.replace(/^@/, "")}</span>
                  )}
                  {bm.force && <span className="ml-1 text-orange-400/70"> -f</span>}
                </p>
                {bm.description && (
                  <p className="text-[10px] text-foreground-secondary/40 truncate">{bm.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => void handleQuickSync(bm)}
                  disabled={syncingId !== null}
                  title={t("p4.bookmark.sync")}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-foreground-secondary/60 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40"
                >
                  {syncingId === bm.id
                    ? <Loader2 size={10} className="animate-spin" />
                    : <RefreshCw size={10} />}
                  {t("p4.bookmark.sync")}
                </button>
                <button
                  onClick={() => setModal({ mode: "edit", bookmark: bm })}
                  title={t("p4.bookmark.edit")}
                  className="rounded-md p-1.5 text-foreground-secondary/40 hover:bg-surface hover:text-foreground transition-colors"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => void handleRemove(bm.id)}
                  title={t("p4.bookmark.remove")}
                  className="rounded-md p-1.5 text-foreground-secondary/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <BookmarkFormModal
          workspaceId={workspaceId}
          initial={modal.mode === "edit" ? modal.bookmark : undefined}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); void loadBookmarks(); }}
        />
      )}
    </div>
  );
}
