import { useCallback } from "react";

const en = {
  "p4.name":                    "Perforce",

  // Navigation
  "p4.page.workspaces":         "Workspaces",
  "p4.page.workspacesDesc":     "Manage Perforce server connections",
  "p4.backToWorkspaces":        "Back to workspaces",

  // Workspace form
  "p4.addWorkspace":            "Add workspace",
  "p4.saveWorkspace":           "Save",
  "p4.editWorkspace":           "Edit workspace",
  "p4.alias":                   "Display name",
  "p4.aliasPlaceholder":        "e.g. Main Depot",
  "p4.port":                    "P4PORT",
  "p4.portPlaceholder":         "e.g. ssl:perforce.example.com:1666",
  "p4.user":                    "P4USER",
  "p4.userPlaceholder":         "your.username",
  "p4.client":                  "P4CLIENT",
  "p4.clientPlaceholder":       "workspace-name",
  "p4.password":                "Password / Ticket",
  "p4.passwordPlaceholder":     "Leave empty to use P4PASSWD from environment",
  "p4.passwordNote":            "Stored locally. Use a login ticket for better security.",
  "p4.removeWorkspace":         "Remove workspace",
  "p4.openWorkspace":           "Open",
  "p4.testConnection":          "Test connection",
  "p4.noWorkspaces":            "No workspaces saved yet. Add one above to get started.",
  "p4.cancel":                  "Cancel",

  // Workspace detail header
  "p4.connected":               "Connected",
  "p4.serverVersion":           "Server version",
  "p4.clientRoot":              "Workspace root",
  "p4.loadingInfo":             "Connecting…",

  // Actions
  "p4.action.refresh":          "Refresh",
  "p4.action.syncAll":          "Sync all",
  "p4.action.syncPath":         "Sync path…",
  "p4.action.revertAll":        "Revert all",
  "p4.action.revertUnchanged":  "Revert unchanged",
  "p4.action.revert":           "Revert",
  "p4.action.submit":           "Submit…",
  "p4.action.shelve":           "Shelve",
  "p4.action.unshelve":         "Unshelve",
  "p4.action.diff":             "Diff",
  "p4.action.details":          "Details",
  "p4.action.close":            "Close",
  "p4.action.edit":             "edit",
  "p4.action.add":              "add",
  "p4.action.delete":           "delete",
  "p4.action.integrate":        "integrate",
  "p4.action.branch":           "branch",

  // Tabs
  "p4.tab.overview":            "Overview",
  "p4.tab.opened":              "Opened",
  "p4.tab.pending":             "Changelists",
  "p4.tab.history":             "History",
  "p4.tab.sync":                "Sync",
  "p4.tab.bookmarks":           "Bookmarks",

  // Overview
  "p4.metric.opened":           "Opened files",
  "p4.metric.pending":          "Pending changes",
  "p4.metric.history":          "History",
  "p4.metric.client":           "Client",
  "p4.section.quickActions":    "Quick Actions",
  "p4.section.recentOpened":    "Recent Opened Files",
  "p4.section.recentChangelists": "Recent Changelists",
  "p4.panel.empty":             "No output for this selection.",
  "p4.confirm.revertFile":      "Revert this file?",

  // Opened files
  "p4.opened.empty":            "No files currently open — workspace is clean.",
  "p4.defaultChange":           "default changelist",
  "p4.changelist":              "Changelist",

  // Submit modal
  "p4.submit.title":            "Submit changelist",
  "p4.submit.description":      "Description",
  "p4.submit.descPlaceholder":  "Describe your changes…",
  "p4.submit.reopen":           "Reopen files after submit",
  "p4.submit.confirm":          "Submit",
  "p4.submit.empty":            "No open files to submit.",
  "p4.submit.missingDesc":      "Please enter a changelist description.",

  // Sync modal
  "p4.sync.title":              "Sync options",
  "p4.sync.pathLabel":          "Depot path (optional)",
  "p4.sync.pathPlaceholder":    "//depot/main/... (empty = full workspace)",
  "p4.sync.clLabel":            "Sync to changelist (optional)",
  "p4.sync.clPlaceholder":      "@12345  (empty = latest)",
  "p4.sync.force":              "Force re-sync (-f)",
  "p4.sync.run":                "Sync",
  "p4.sync.workspaceLatest":    "Workspace latest",
  "p4.sync.pathOrChangelist":   "Path or changelist",

  // Changelists
  "p4.pending.empty":           "No pending numbered changelists.",
  "p4.history.empty":           "No submitted changelists found.",

  // Bookmarks
  "p4.bookmark.add":            "Add bookmark",
  "p4.bookmark.edit":           "Edit bookmark",
  "p4.bookmark.name":           "Name",
  "p4.bookmark.namePlaceholder":"e.g. Game Assets",
  "p4.bookmark.depotPath":      "Depot path",
  "p4.bookmark.depotPathPlaceholder": "//depot/main/...",
  "p4.bookmark.changelist":     "Changelist (optional)",
  "p4.bookmark.clPlaceholder":  "@12345 (empty = latest)",
  "p4.bookmark.force":          "Force re-sync (-f)",
  "p4.bookmark.note":           "Note (optional)",
  "p4.bookmark.notePlaceholder":"Quick note about this path…",
  "p4.bookmark.save":           "Save bookmark",
  "p4.bookmark.empty":          "No bookmarks yet. Save a depot path to quickly sync it later.",
  "p4.bookmark.sync":           "Sync",
  "p4.bookmark.remove":         "Remove bookmark",

  // Feedback
  "p4.feedback.synced":         "Sync complete.",
  "p4.feedback.reverted":       "Revert complete.",
  "p4.feedback.submitted":      "Changelist submitted successfully.",
  "p4.feedback.shelved":        "Files shelved.",
  "p4.feedback.unshelved":      "Files unshelved into default changelist.",
  "p4.feedback.actionRunning":  "Operation running...",
  "p4.feedback.actionDone":     "Done.",
  "p4.feedback.successTitle":   "{action} succeeded",
  "p4.feedback.errorTitle":     "{action} failed",
  "p4.feedback.details":        "Command details",
  "p4.feedback.bookmarkSaved":  "Bookmark saved.",
  "p4.feedback.bookmarkRemoved":"Bookmark removed.",
} as const;

type P4TranslationKey = keyof typeof en;

const zh: Record<P4TranslationKey, string> = {
  "p4.name":                    "Perforce",

  "p4.page.workspaces":         "工作区",
  "p4.page.workspacesDesc":     "管理 Perforce 服务器连接",
  "p4.backToWorkspaces":        "返回工作区列表",
  "p4.addWorkspace":            "添加工作区",
  "p4.saveWorkspace":           "保存",
  "p4.editWorkspace":           "编辑工作区",
  "p4.alias":                   "显示名称",
  "p4.aliasPlaceholder":        "例如：主 Depot",
  "p4.port":                    "P4PORT",
  "p4.portPlaceholder":         "例如：ssl:perforce.example.com:1666",
  "p4.user":                    "P4USER",
  "p4.userPlaceholder":         "your.username",
  "p4.client":                  "P4CLIENT",
  "p4.clientPlaceholder":       "workspace-name",
  "p4.password":                "密码 / Ticket",
  "p4.passwordPlaceholder":     "留空则使用环境变量 P4PASSWD",
  "p4.passwordNote":            "密码本地存储。建议使用登录票据以提高安全性。",
  "p4.removeWorkspace":         "移除工作区",
  "p4.openWorkspace":           "打开",
  "p4.testConnection":          "测试连接",
  "p4.noWorkspaces":            "还没有保存任何工作区，在上方添加一个来开始。",
  "p4.cancel":                  "取消",
  "p4.connected":               "已连接",
  "p4.serverVersion":           "服务器版本",
  "p4.clientRoot":              "工作区根目录",
  "p4.loadingInfo":             "连接中…",
  "p4.action.refresh":          "刷新",
  "p4.action.syncAll":          "同步全部",
  "p4.action.syncPath":         "同步指定路径…",
  "p4.action.revertAll":        "全部还原",
  "p4.action.revertUnchanged":  "还原未修改文件",
  "p4.action.revert":           "还原",
  "p4.action.submit":           "提交…",
  "p4.action.shelve":           "搁置",
  "p4.action.unshelve":         "取消搁置",
  "p4.action.diff":             "Diff",
  "p4.action.details":          "详情",
  "p4.action.close":            "关闭",
  "p4.action.edit":             "编辑",
  "p4.action.add":              "添加",
  "p4.action.delete":           "删除",
  "p4.action.integrate":        "集成",
  "p4.action.branch":           "分支",
  "p4.tab.overview":            "概览",
  "p4.tab.opened":              "已打开",
  "p4.tab.pending":             "变更列表",
  "p4.tab.history":             "历史",
  "p4.tab.sync":                "同步",
  "p4.tab.bookmarks":           "书签",
  "p4.metric.opened":           "已打开文件",
  "p4.metric.pending":          "待处理变更",
  "p4.metric.history":          "历史",
  "p4.metric.client":           "客户端",
  "p4.section.quickActions":    "快捷操作",
  "p4.section.recentOpened":    "最近打开文件",
  "p4.section.recentChangelists": "最近变更列表",
  "p4.panel.empty":             "当前选择没有输出。",
  "p4.confirm.revertFile":      "还原此文件？",
  "p4.opened.empty":            "当前没有打开的文件，工作区很干净。",
  "p4.defaultChange":           "默认变更列表",
  "p4.changelist":              "变更列表",
  "p4.submit.title":            "提交变更列表",
  "p4.submit.description":      "描述",
  "p4.submit.descPlaceholder":  "描述本次改动…",
  "p4.submit.reopen":           "提交后重新打开文件",
  "p4.submit.confirm":          "提交",
  "p4.submit.empty":            "没有可提交的打开文件。",
  "p4.submit.missingDesc":      "请输入变更列表描述。",
  "p4.sync.title":              "同步选项",
  "p4.sync.pathLabel":          "Depot 路径（可选）",
  "p4.sync.pathPlaceholder":    "//depot/main/...（为空则同步整个工作区）",
  "p4.sync.clLabel":            "同步到变更列表（可选）",
  "p4.sync.clPlaceholder":      "@12345（为空则同步到最新）",
  "p4.sync.force":              "强制重新同步（-f）",
  "p4.sync.run":                "同步",
  "p4.sync.workspaceLatest":    "同步工作区到最新",
  "p4.sync.pathOrChangelist":   "按路径或变更列表同步",
  "p4.pending.empty":           "没有待处理的编号变更列表。",
  "p4.history.empty":           "未找到已提交的变更列表。",
  "p4.bookmark.add":            "添加书签",
  "p4.bookmark.edit":           "编辑书签",
  "p4.bookmark.name":           "名称",
  "p4.bookmark.namePlaceholder":"例如：游戏资产",
  "p4.bookmark.depotPath":      "Depot 路径",
  "p4.bookmark.depotPathPlaceholder": "//depot/main/...",
  "p4.bookmark.changelist":     "变更列表（可选）",
  "p4.bookmark.clPlaceholder":  "@12345（为空则同步到最新）",
  "p4.bookmark.force":          "强制重新同步（-f）",
  "p4.bookmark.note":           "备注（可选）",
  "p4.bookmark.notePlaceholder":"关于此路径的简短备注…",
  "p4.bookmark.save":           "保存书签",
  "p4.bookmark.empty":          "还没有书签。保存一个 Depot 路径以便快速同步。",
  "p4.bookmark.sync":           "同步",
  "p4.bookmark.remove":         "删除书签",
  "p4.feedback.synced":         "同步完成。",
  "p4.feedback.reverted":       "还原完成。",
  "p4.feedback.submitted":      "变更列表提交成功。",
  "p4.feedback.shelved":        "文件已搁置。",
  "p4.feedback.unshelved":      "文件已取消搁置到默认变更列表。",
  "p4.feedback.actionRunning":  "操作正在执行...",
  "p4.feedback.actionDone":     "操作完成。",
  "p4.feedback.successTitle":   "{action} 成功",
  "p4.feedback.errorTitle":     "{action} 失败",
  "p4.feedback.details":        "命令详情",
  "p4.feedback.bookmarkSaved":  "书签已保存。",
  "p4.feedback.bookmarkRemoved":"书签已删除。",
};

const translations: Record<string, Record<P4TranslationKey, string>> = { en, zh };

export function useP4T() {
  const locale = getLocale();
  const dict = translations[locale] ?? en;

  return useCallback((key: P4TranslationKey, vars?: Record<string, string | number>): string => {
    const raw = dict[key] ?? (en as Record<P4TranslationKey, string>)[key] ?? key;
    if (!vars) return raw;
    return Object.entries(vars).reduce<string>(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      raw,
    );
  }, [dict]);
}

export type { P4TranslationKey };

function getLocale(): "en" | "zh" {
  const stored = window.localStorage.getItem("hf:locale");
  if (stored === "zh" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}
