export interface SavedWorkspace {
  id: string;
  alias: string;
  port: string;
  p4user: string;
  client: string;
  root: string | null;
  added_at: string;
}

export interface P4Info {
  user: string;
  client: string;
  client_root: string;
  server_address: string;
  server_version: string;
  client_host: string;
  connected: boolean;
}

export interface OpenedFile {
  depot_path: string;
  rev: number;
  action: string;
  change: string;
  file_type: string;
}

export interface P4Changelist {
  number: string;
  date: string;
  user: string;
  client: string;
  description: string;
  status: "pending" | "submitted";
}

export interface SavedBookmark {
  id: string;
  workspace_id: string;
  name: string;
  depot_path: string;
  changelist: string;
  force: boolean;
  description: string;
  created_at: string;
}

export type P4Page     = "workspaces" | "detail";
export type DetailTab  = "overview" | "opened" | "pending" | "history" | "sync" | "bookmarks";
export type DetailModal = "submit" | "sync" | null;
