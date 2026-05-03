import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useP4T } from "../i18n";
import type { SavedBookmark } from "../types";
import { p4Invoke } from "../ipc";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { InputField } from "../components/InputField";
import { ModalOverlay } from "../components/ModalOverlay";

export function BookmarkFormModal({
  workspaceId,
  initial,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  initial?: SavedBookmark;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useP4T();
  const [name, setName] = useState(initial?.name ?? "");
  const [depotPath, setDepotPath] = useState(initial?.depot_path ?? "");
  const [cl, setCl] = useState(initial?.changelist ?? "");
  const [force, setForce] = useState(initial?.force ?? false);
  const [note, setNote] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  const handleSave = async () => {
    if (!name.trim() || !depotPath.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await p4Invoke("p4_upsert_bookmark", {
        id:           initial?.id,
        workspace_id: workspaceId,
        name:         name.trim(),
        depot_path:   depotPath.trim(),
        changelist:   cl.replace(/^@/, "").trim(),
        force,
        description:  note.trim(),
      });
      savedRef.current();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {initial ? t("p4.bookmark.edit") : t("p4.bookmark.add")}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-foreground-secondary/40 hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <InputField
            label={t("p4.bookmark.name")}
            value={name}
            onChange={setName}
            placeholder={t("p4.bookmark.namePlaceholder")}
          />
          <InputField
            label={t("p4.bookmark.depotPath")}
            value={depotPath}
            onChange={setDepotPath}
            placeholder={t("p4.bookmark.depotPathPlaceholder")}
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label={t("p4.bookmark.changelist")}
              value={cl}
              onChange={setCl}
              placeholder={t("p4.bookmark.clPlaceholder")}
            />
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-xs text-foreground-secondary/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-border bg-background"
                />
                {t("p4.bookmark.force")}
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">{t("p4.bookmark.note")}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("p4.bookmark.notePlaceholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary/40 focus:border-primary/40 focus:outline-none transition-all"
            />
          </div>
        </div>

        {error && <FeedbackBanner tone="error" message={error} onClose={() => setError(null)} />}

        <div className="flex gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={busy || !name.trim() || !depotPath.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : t("p4.bookmark.save")}
          </button>
          <button onClick={onClose} className="rounded-lg border border-border px-5 py-2.5 text-sm text-foreground-secondary hover:text-foreground transition-colors">
            {t("p4.cancel")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
