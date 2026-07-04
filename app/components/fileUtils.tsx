import { FilePen, FilePlus, FileX, GitMerge } from "lucide-react";

export function actionIcon(action: string) {
  const a = action.toLowerCase();
  if (a === "edit")   return <FilePen  size={11} className="shrink-0 text-yellow-400" />;
  if (a === "add")    return <FilePlus size={11} className="shrink-0 text-green-400" />;
  if (a === "delete") return <FileX    size={11} className="shrink-0 text-red-400" />;
  return <GitMerge size={11} className="shrink-0 text-blue-400" />;
}

export function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a === "edit")   return "text-yellow-400";
  if (a === "add")    return "text-green-400";
  if (a === "delete") return "text-red-400";
  return "text-blue-400";
}

export function fileBasename(depotPath: string): string {
  return depotPath.split("/").pop() ?? depotPath;
}

export function depotDir(depotPath: string): string {
  const parts = depotPath.split("/");
  return parts.slice(0, -1).join("/");
}

export function depotPathWithRev(depotPath: string, rev?: number): string {
  return rev && rev > 0 ? `${depotPath}#${rev}` : depotPath;
}
