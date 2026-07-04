import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useP4T } from "../i18n";
import type { OpenedFile } from "../types";
import { actionIcon, actionColor, depotPathWithRev } from "../components/fileUtils";

export function OpenedFilesTab({
  files,
  onRevertFile,
  onDiffFile,
  busy,
}: {
  files: OpenedFile[];
  onRevertFile: (depotPath: string) => void;
  onDiffFile: (depotPath: string) => void;
  busy: boolean;
}) {
  const t = useP4T();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["default"]));

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground-secondary/40">
        <Layers size={32} className="mb-3 opacity-20" />
        <p className="text-sm">{t("p4.opened.empty")}</p>
      </div>
    );
  }

  const groups = new Map<string, OpenedFile[]>();
  for (const f of files) {
    const key = f.change === "default" ? "default" : f.change;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div>
      {Array.from(groups.entries()).map(([cl, groupFiles]) => {
        const isExpanded = expanded.has(cl);
        const label = cl === "default"
          ? t("p4.defaultChange")
          : `${t("p4.changelist")} #${cl}`;
        return (
          <div key={cl}>
            <button
              onClick={() => toggleGroup(cl)}
              className="flex w-full items-center gap-2 border-b border-border/40 px-4 py-2 text-left text-xs font-semibold text-foreground-secondary/60 hover:bg-surface/40 transition-colors"
            >
              {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span className="flex-1">{label}</span>
              <span className="rounded bg-background px-1.5 py-0.5 text-[10px]">{groupFiles.length}</span>
            </button>
            {isExpanded && groupFiles.map((f) => (
              <div
                key={f.depot_path}
                className="group flex items-center gap-2 border-b border-border/20 px-4 py-1.5 hover:bg-surface/30 transition-colors"
              >
                {actionIcon(f.action)}
                <div className="min-w-0 flex-1">
                  <span className={clsx("block break-all font-mono text-xs leading-snug", actionColor(f.action))} title={f.depot_path}>
                    {depotPathWithRev(f.depot_path, f.rev)}
                  </span>
                  <span className="block text-[10px] text-foreground-secondary/40">
                    {f.change === "default" ? t("p4.defaultChange") : `${t("p4.changelist")} #${f.change}`}
                  </span>
                </div>
                <span className="shrink-0 rounded bg-background/60 px-1.5 py-0.5 text-[9px] font-mono text-foreground-secondary/50">
                  {f.file_type}
                </span>
                <button
                  onClick={() => onDiffFile(f.depot_path)}
                  disabled={busy}
                  className="shrink-0 rounded-md px-2 py-1 text-[10px] text-foreground-secondary/40 opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-foreground disabled:cursor-not-allowed transition-all"
                >
                  {t("p4.action.diff")}
                </button>
                <button
                  onClick={() => onRevertFile(f.depot_path)}
                  disabled={busy}
                  className="shrink-0 rounded-md px-2 py-1 text-[10px] text-foreground-secondary/40 opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed transition-all"
                >
                  {t("p4.action.revert")}
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
