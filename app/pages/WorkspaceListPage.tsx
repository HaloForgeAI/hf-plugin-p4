import { useState } from "react";
import { ArrowRight, Layers, Loader2, Plus, Server, Settings, Trash2 } from "lucide-react";
import { useP4T } from "../i18n";
import type { SavedWorkspace, P4Info } from "../types";
import { p4Invoke } from "../ipc";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { InputField } from "../components/InputField";

export function WorkspaceListPage({
  workspaces,
  onSelect,
  onRemove,
  onRefresh,
}: {
  workspaces: SavedWorkspace[];
  onSelect: (ws: SavedWorkspace) => void;
  onRemove: (id: string) => void;
  onRefresh: () => void;
}) {
  const t = useP4T();
  const [form, setForm] = useState<{
    id?: string; alias: string; port: string; user: string; client: string; password: string;
  }>({ alias: "", port: "", user: "", client: "", password: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const resetForm = () => {
    setForm({ alias: "", port: "", user: "", client: "", password: "" });
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!form.port.trim() || !form.user.trim() || !form.client.trim()) return;
    setSaving(true);
    try {
      await p4Invoke("p4_upsert_workspace", {
        id:       form.id,
        alias:    form.alias || form.client,
        port:     form.port,
        user:     form.user,
        client:   form.client,
        password: form.password,
      });
      resetForm();
      setFormOpen(false);
      onRefresh();
    } catch {
      // errors surfaced on the parent
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!form.port.trim() || !form.user.trim() || !form.client.trim()) return;
    setSaving(true);
    setTestResult(null);
    try {
      const res = await p4Invoke<{ workspace: { id: string } }>("p4_upsert_workspace", {
        id:       form.id,
        alias:    form.alias || form.client,
        port:     form.port,
        user:     form.user,
        client:   form.client,
        password: form.password,
      });
      const tempId = res.workspace.id;
      if (!form.id) setForm((f) => ({ ...f, id: tempId }));
      onRefresh();

      const info = await p4Invoke<{ info: P4Info }>("p4_test_connection", { workspace_id: tempId });
      setTestResult({
        ok: true,
        msg: `${info.info.server_address} · ${info.info.server_version} · root: ${info.info.client_root}`,
      });
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.port.trim() && form.user.trim() && form.client.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header + add form */}
      <section className="rounded-2xl border border-border bg-surface/30 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t("p4.page.workspaces")}</h2>
              <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-foreground-secondary">
                {workspaces.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-foreground-secondary/60">{t("p4.page.workspacesDesc")}</p>
          </div>
          <button
            onClick={() => { resetForm(); setFormOpen((v) => !v); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus size={13} />
            {t("p4.addWorkspace")}
          </button>
        </div>

        {formOpen && (
          <div className="mt-5 rounded-xl border border-border bg-background p-4 space-y-3">
            <h3 className="text-xs font-semibold text-foreground">
              {form.id ? t("p4.editWorkspace") : t("p4.addWorkspace")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label={t("p4.alias")}  value={form.alias}  onChange={(v) => setForm((f) => ({ ...f, alias: v }))}  placeholder={t("p4.aliasPlaceholder")} />
              <InputField label={t("p4.port")}   value={form.port}   onChange={(v) => setForm((f) => ({ ...f, port: v }))}   placeholder={t("p4.portPlaceholder")} />
              <InputField label={t("p4.user")}   value={form.user}   onChange={(v) => setForm((f) => ({ ...f, user: v }))}   placeholder={t("p4.userPlaceholder")} />
              <InputField label={t("p4.client")} value={form.client} onChange={(v) => setForm((f) => ({ ...f, client: v }))} placeholder={t("p4.clientPlaceholder")} />
            </div>
            <InputField
              label={t("p4.password")}
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              placeholder={t("p4.passwordPlaceholder")}
              type="password"
              hint={t("p4.passwordNote")}
            />
            {testResult && (
              <FeedbackBanner
                tone={testResult.ok ? "success" : "error"}
                message={testResult.msg}
                onClose={() => setTestResult(null)}
              />
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void handleSave()}
                disabled={!canSave || saving}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : t("p4.saveWorkspace")}
              </button>
              <button
                onClick={() => void handleTestConnection()}
                disabled={!canSave || saving}
                className="rounded-lg border border-border px-4 py-2 text-xs text-foreground-secondary hover:bg-surface hover:text-foreground disabled:opacity-40 transition-colors"
              >
                {t("p4.testConnection")}
              </button>
              <button
                onClick={() => { setFormOpen(false); resetForm(); }}
                className="ml-auto rounded-lg border border-border px-4 py-2 text-xs text-foreground-secondary hover:text-foreground transition-colors"
              >
                {t("p4.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Workspace list */}
      <section className="rounded-2xl border border-border bg-surface/20 p-3">
        {workspaces.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-foreground-secondary/40">
            {t("p4.noWorkspaces")}
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3 transition-colors hover:border-border hover:bg-background"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Server size={13} className="shrink-0 text-primary/70" />
                    <span className="truncate text-sm font-semibold text-foreground">{ws.alias}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-foreground-secondary/60">
                    <span className="font-mono">{ws.port}</span>
                    <span>{ws.p4user} @ {ws.client}</span>
                    {ws.root && <span className="truncate">{ws.root}</span>}
                  </div>
                </div>

                <button
                  onClick={() => {
                    resetForm();
                    setForm({ id: ws.id, alias: ws.alias, port: ws.port, user: ws.p4user, client: ws.client, password: "" });
                    setFormOpen(true);
                  }}
                  title={t("p4.editWorkspace")}
                  className="rounded-md p-1.5 text-foreground-secondary/40 hover:bg-surface hover:text-foreground transition-colors"
                >
                  <Settings size={13} />
                </button>
                <button
                  onClick={() => onSelect(ws)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground"
                >
                  {t("p4.openWorkspace")} <ArrowRight size={11} />
                </button>
                <button
                  onClick={() => onRemove(ws.id)}
                  title={t("p4.removeWorkspace")}
                  className="rounded-md p-1.5 text-foreground-secondary/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
