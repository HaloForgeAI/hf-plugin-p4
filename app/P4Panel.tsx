import { useCallback, useEffect, useState } from "react";
import { p4Invoke, LAST_WS_KEY } from "./ipc";
import type { P4Info, P4Page, SavedWorkspace } from "./types";
import { FeedbackBanner } from "./components/FeedbackBanner";
import { WorkspaceListPage } from "./pages/WorkspaceListPage";
import { DetailPage } from "./pages/DetailPage";

export function P4Panel() {
  const [page, setPage] = useState<P4Page>("workspaces");
  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<SavedWorkspace | null>(null);
  const [wsInfo, setWsInfo] = useState<P4Info | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await p4Invoke<{ workspaces: SavedWorkspace[] }>("p4_saved_workspaces");
      setWorkspaces(res.workspaces);
      return res.workspaces;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, []);

  const handleSelectWorkspace = useCallback(async (ws: SavedWorkspace) => {
    setSelectedWs(ws);
    setWsInfo(null);
    setError(null);
    setPage("detail");
    try { window.localStorage.setItem(LAST_WS_KEY, ws.id); } catch { /* ignore */ }
    try {
      const res = await p4Invoke<{ info: P4Info }>("p4_test_connection", { workspace_id: ws.id });
      setWsInfo(res.info);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleRemoveWorkspace = useCallback(async (id: string) => {
    try {
      await p4Invoke("p4_remove_workspace", { id });
      await loadWorkspaces();
      if (selectedWs?.id === id) {
        setPage("workspaces");
        setSelectedWs(null);
        setWsInfo(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [loadWorkspaces, selectedWs]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const wsList = await loadWorkspaces();
      if (cancelled || wsList.length === 0) return;
      let lastId: string | null = null;
      try { lastId = window.localStorage.getItem(LAST_WS_KEY); } catch { /* ignore */ }
      const last = wsList.find((w) => w.id === lastId) ?? null;
      if (last && !cancelled) await handleSelectWorkspace(last);
    })();
    return () => { cancelled = true; };
  }, [loadWorkspaces, handleSelectWorkspace]);

  return (
    <div className="space-y-3">
      {error && page === "workspaces" && (
        <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />
      )}

      {page === "workspaces" ? (
        <WorkspaceListPage
          workspaces={workspaces}
          onSelect={(ws) => void handleSelectWorkspace(ws)}
          onRemove={(id) => void handleRemoveWorkspace(id)}
          onRefresh={() => void loadWorkspaces()}
        />
      ) : selectedWs ? (
        <DetailPage
          workspace={selectedWs}
          info={wsInfo}
          onBack={() => { setPage("workspaces"); setWsInfo(null); }}
        />
      ) : null}
    </div>
  );
}
